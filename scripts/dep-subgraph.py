#!/usr/bin/env python3
"""
dep-subgraph.py — emit a smart transitive dependency subgraph for a given file.

Traversal rules:
  - Follows imports (downward) up to MAX_DEPTH levels via BFS
  - Hub nodes (imported by >= HUB_THRESHOLD files) are shown but NOT expanded —
    they're shared utilities that would otherwise flood the output
  - Dependents (upward) are shown 1 level only — who directly uses this file
  - Output is a compact indented tree

Usage (called by Claude Code PreToolUse hook — receives JSON on stdin):
  echo '{"file_path":"/abs/path/to/file"}' | python3 scripts/dep-subgraph.py

Direct usage:
  python3 scripts/dep-subgraph.py frontend/src/pages/DashboardPage.tsx
  python3 scripts/dep-subgraph.py backend/src/.../MonthlyInvestmentService.kt
  python3 scripts/dep-subgraph.py --stats   # print hub node report for both graphs
"""

import json
import sys
import os
import re
from collections import defaultdict, deque

REPO_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_GRAPH = os.path.join(REPO_ROOT, ".claude/context/frontend-dep-graph.json")
BACKEND_GRAPH  = os.path.join(REPO_ROOT, ".claude/context/backend-dep-graph.json")

MAX_DEPTH     = 3   # levels to traverse downward
HUB_THRESHOLD = 4   # nodes imported by >= this many files are treated as shared utilities


# ── Graph loading ─────────────────────────────────────────────────────────────

def load_graph(path):
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


def build_reverse(graph):
    """Return a dict: node → list of nodes that import it."""
    rev = defaultdict(list)
    for node, deps in graph.items():
        for dep in deps:
            rev[dep].append(node)
    return rev


def find_hubs(graph, threshold):
    """Return set of node keys imported by >= threshold other nodes."""
    import_count = defaultdict(int)
    for deps in graph.values():
        for dep in deps:
            import_count[dep] += 1
    return {node for node, count in import_count.items() if count >= threshold}


# ── Key resolution ────────────────────────────────────────────────────────────

def frontend_key(abs_path):
    match = re.search(r"/frontend/src/(.+)", abs_path)
    return match.group(1) if match else None


def backend_key(abs_path):
    match = re.search(r"/kotlin/com/investment/(.+)\.kt$", abs_path)
    return match.group(1).replace("/", ".") if match else None


# ── Transitive BFS subgraph ───────────────────────────────────────────────────

def bfs_subgraph(graph, start_key, hubs, max_depth):
    """
    BFS downward from start_key.
    Returns a list of (depth, node, deps_shown, is_hub, truncated) tuples.
    Hub nodes are included but their children are not expanded.
    Nodes already visited are not re-expanded (DAG dedup).
    """
    visited  = set()
    result   = []   # (depth, node, children_list, is_hub, was_truncated)
    queue    = deque()  # (node, depth)

    # seed: direct deps of start_key
    direct_deps = graph.get(start_key, [])
    if not direct_deps:
        return result

    for dep in direct_deps:
        queue.append((dep, 1))

    while queue:
        node, depth = queue.popleft()

        if node in visited:
            continue
        visited.add(node)

        is_hub     = node in hubs
        node_deps  = graph.get(node, [])
        truncated  = False

        if depth >= max_depth or is_hub:
            # Show node but don't expand children
            children_shown = node_deps if node_deps else []
            truncated      = bool(node_deps) and (depth >= max_depth) and not is_hub
            result.append((depth, node, children_shown, is_hub, truncated))
        else:
            result.append((depth, node, node_deps, False, False))
            for child in node_deps:
                if child not in visited:
                    queue.append((child, depth + 1))

    return result


# ── Render ────────────────────────────────────────────────────────────────────

def render_tree(start_key, bfs_rows, direct_deps, dependents, hubs):
    lines = [f"[dep-graph] {start_key}"]

    if not direct_deps and not dependents:
        lines.append("  (no tracked relationships)")
        return "\n".join(lines)

    # ── Imports section ───────────────────────────────────────────────────
    if direct_deps:
        lines.append(f"  imports ({len(direct_deps)}):")

        # Group bfs_rows by depth for tree-like rendering
        # Use a simple indented list: depth controls indent level
        node_to_row = {row[1]: row for row in bfs_rows}

        def render_node(node, depth, rendered):
            if node in rendered:
                lines.append(f"{'    ' * depth}{'└─ ' if depth else '  • '}{node}  [already shown]")
                return
            rendered.add(node)
            row = node_to_row.get(node)
            indent = "    " * depth
            prefix = "└─ " if depth > 0 else "  • "

            if row is None:
                # leaf not in graph (external or missing)
                lines.append(f"{indent}{prefix}{node}")
                return

            _, _node, children, is_hub, truncated = row
            suffix = "  [shared]" if is_hub else ("  […]" if truncated else "")
            lines.append(f"{indent}{prefix}{node}{suffix}")

            if not is_hub and not truncated and children:
                for child in children:
                    render_node(child, depth + 1, rendered)

        rendered = set()
        for dep in direct_deps:
            render_node(dep, 1, rendered)

    # ── Dependents section ────────────────────────────────────────────────
    if dependents:
        lines.append(f"  used by ({len(dependents)}): {', '.join(dependents)}")

    return "\n".join(lines)


# ── Main subgraph function ────────────────────────────────────────────────────

def subgraph_for(abs_path):
    is_frontend = "/frontend/src/" in abs_path
    is_backend  = "/kotlin/com/investment/" in abs_path

    if is_frontend:
        graph = load_graph(FRONTEND_GRAPH)
        key   = frontend_key(abs_path)
        layer = "frontend"
    elif is_backend:
        graph = load_graph(BACKEND_GRAPH)
        key   = backend_key(abs_path)
        layer = "backend"
    else:
        return None

    if not key or not graph:
        return None

    hubs        = find_hubs(graph, HUB_THRESHOLD)
    reverse     = build_reverse(graph)
    direct_deps = graph.get(key, [])
    dependents  = reverse.get(key, [])

    if not direct_deps and not dependents:
        return None

    bfs_rows = bfs_subgraph(graph, key, hubs, MAX_DEPTH)
    return render_tree(key, bfs_rows, direct_deps, dependents, hubs)


# ── Stats mode ────────────────────────────────────────────────────────────────

def print_stats():
    for label, path in [("frontend", FRONTEND_GRAPH), ("backend", BACKEND_GRAPH)]:
        graph = load_graph(path)
        if not graph:
            print(f"{label}: graph not found")
            continue
        hubs = find_hubs(graph, HUB_THRESHOLD)
        from collections import Counter
        import_counts = Counter()
        for deps in graph.values():
            for d in deps:
                import_counts[d] += 1
        print(f"\n=== {label} hub nodes (imported >= {HUB_THRESHOLD}x) ===")
        for node, count in import_counts.most_common(20):
            marker = " ← HUB" if node in hubs else ""
            print(f"  {count:3d}x  {node}{marker}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--stats":
        print_stats()
        return

    if len(sys.argv) > 1:
        raw_path = sys.argv[1]
    else:
        try:
            data = json.load(sys.stdin)
            raw_path = data.get("file_path", "")
        except Exception:
            sys.exit(0)

    if not raw_path:
        sys.exit(0)

    abs_path = raw_path if os.path.isabs(raw_path) else os.path.join(REPO_ROOT, raw_path)
    result   = subgraph_for(abs_path)

    if result:
        print(result)


if __name__ == "__main__":
    main()
