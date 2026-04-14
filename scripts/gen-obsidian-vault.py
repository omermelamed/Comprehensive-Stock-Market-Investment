#!/usr/bin/env python3
"""
gen-obsidian-vault.py — Generate an Obsidian vault from the project dependency graphs.

Each graph node becomes a Markdown file with [[wikilinks]] to its dependencies
and a "used by" section listing direct dependents. Open the output directory as
an Obsidian vault to get a navigable, visual dependency graph.

Usage:
    python3 scripts/gen-obsidian-vault.py
    python3 scripts/gen-obsidian-vault.py --output /custom/vault/path
"""

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT      = Path(__file__).parent.parent
FRONTEND_GRAPH = REPO_ROOT / ".claude/context/frontend-dep-graph.json"
BACKEND_GRAPH  = REPO_ROOT / ".claude/context/backend-dep-graph.json"
DEFAULT_VAULT  = REPO_ROOT / "obsidian-vault"


# ── Graph helpers ─────────────────────────────────────────────────────────────

def load_graph(path):
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def build_reverse(graph):
    rev = defaultdict(list)
    for node, deps in graph.items():
        for dep in deps:
            rev[dep].append(node)
    return rev


def all_nodes(graph):
    """All nodes — those with outgoing edges plus those only referenced as deps."""
    nodes = set(graph.keys())
    for deps in graph.values():
        nodes.update(deps)
    return nodes


# ── Key → vault path ──────────────────────────────────────────────────────────

def frontend_key_to_path(key):
    """'pages/DashboardPage.tsx' → 'frontend/pages/DashboardPage'"""
    key = re.sub(r'\.(tsx?|jsx?)$', '', key)
    return f"frontend/{key}"


def backend_key_to_path(key):
    """'api.AllocationController' → 'backend/api/AllocationController'"""
    return "backend/" + key.replace(".", "/")


# ── Node type inference ───────────────────────────────────────────────────────

def frontend_node_type(key):
    first = key.split("/")[0] if "/" in key else "root"
    return {
        "pages":      "page",
        "hooks":      "hook",
        "api":        "api-client",
        "components": "component",
        "contexts":   "context",
        "layouts":    "layout",
        "types":      "types",
        "utils":      "util",
    }.get(first, first)


def backend_node_type(key):
    parts = key.split(".")
    first = parts[0] if parts else "unknown"
    last  = parts[-1] if parts else ""
    if first == "api":
        if last.endswith("Controller"):
            return "controller"
        if "dto" in parts:
            return "dto"
        return "api"
    return {
        "application":  "service",
        "domain":       "domain",
        "infrastructure": "repository" if last.endswith("Repository") else "infrastructure",
        "config":       "config",
    }.get(first, first)


# ── Display name ──────────────────────────────────────────────────────────────

def display_name(key):
    """Extract the short class/file name: 'pages/DashboardPage.tsx' → 'DashboardPage'"""
    # Strip file extension first, then take the last path or package segment
    stripped = re.sub(r'\.(tsx?|jsx?)$', '', key)
    return stripped.replace("\\", "/").split("/")[-1].split(".")[-1]


# ── Markdown generation ───────────────────────────────────────────────────────

def render_node_md(node_key, deps, used_by, key_to_path_fn, node_type_fn):
    name  = display_name(node_key)
    ntype = node_type_fn(node_key)

    lines = [
        "---",
        f"type: {ntype}",
        f"key: {node_key}",
        "---",
        "",
        f"# {name}",
        "",
    ]

    if deps:
        lines.append("## Dependencies")
        for dep in sorted(deps):
            dep_path = key_to_path_fn(dep)
            dep_name = display_name(dep)
            lines.append(f"- [[{dep_path}|{dep_name}]]")
        lines.append("")

    if used_by:
        lines.append("## Used by")
        for user in sorted(used_by):
            user_path = key_to_path_fn(user)
            user_name = display_name(user)
            lines.append(f"- [[{user_path}|{user_name}]]")
        lines.append("")

    if not deps and not used_by:
        lines.append("*No tracked dependencies.*")
        lines.append("")

    return "\n".join(lines)


# ── Vault writer ──────────────────────────────────────────────────────────────

def write_layer(graph, label, key_to_path_fn, node_type_fn, vault_root):
    if not graph:
        print(f"[obsidian] {label}: graph not found — skipping")
        return 0

    reverse = build_reverse(graph)
    count   = 0

    for node in all_nodes(graph):
        deps    = graph.get(node, [])
        used_by = reverse.get(node, [])

        out_path = vault_root / f"{key_to_path_fn(node)}.md"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            render_node_md(node, deps, used_by, key_to_path_fn, node_type_fn)
        )
        count += 1

    print(f"[obsidian] {label}: {count} nodes written")
    return count


def write_index(vault_root, frontend_graph, backend_graph):
    fe_count = len(all_nodes(frontend_graph)) if frontend_graph else 0
    be_count = len(all_nodes(backend_graph))  if backend_graph  else 0

    content = f"""# Dependency Graph

Auto-generated from `.claude/context/frontend-dep-graph.json` and `backend-dep-graph.json`.
Regenerate with: `python3 scripts/gen-obsidian-vault.py`

| Layer    | Nodes |
|----------|-------|
| Frontend | {fe_count} |
| Backend  | {be_count} |

## Browse

- [[frontend/App|Frontend entry (App.tsx)]]
- Backend controllers live under `backend/api/`

## Notes

- An edge A → B means A imports B.
- Nodes with no outgoing edges are leaves (types, utilities, external libs).
- Use Obsidian's graph view (Ctrl+G) to see the full dependency map.
"""
    (vault_root / "README.md").write_text(content)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--output":
        vault_root = Path(sys.argv[2])
    else:
        vault_root = DEFAULT_VAULT

    print(f"[obsidian] Writing vault to: {vault_root}")
    vault_root.mkdir(parents=True, exist_ok=True)

    frontend_graph = load_graph(FRONTEND_GRAPH)
    backend_graph  = load_graph(BACKEND_GRAPH)

    write_layer(frontend_graph, "frontend", frontend_key_to_path, frontend_node_type, vault_root)
    write_layer(backend_graph,  "backend",  backend_key_to_path,  backend_node_type,  vault_root)
    write_index(vault_root, frontend_graph, backend_graph)

    print(f"[obsidian] Done. Open '{vault_root}' as an Obsidian vault.")


if __name__ == "__main__":
    main()
