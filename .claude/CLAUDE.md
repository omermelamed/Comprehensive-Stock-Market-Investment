# Claude workspace notes

This `.claude/` directory exists to keep project guidance modular, discoverable, and cheap to load.

## How to use this directory

1. Start with the repository `CLAUDE.md`.
2. Read the context package when you need product, domain, architectural, or design guidance.
3. Let path-scoped rules narrow the guidance for the files being edited.
4. Use a project skill for repeatable workflows.
5. Use a subagent when a task clearly belongs to one layer.

## Design intent

This setup is optimized for:
- better first-pass implementation quality
- lower token usage through shared references
- clearer handoffs between backend, frontend, and database work
- deterministic financial logic before AI enrichment

## Conventions

- Context files hold reusable knowledge.
- Rules are short and path-scoped.
- Skills encode repeatable workflows and checklists.
- Agents own layer-specific implementation and review behavior.
- Commands provide ergonomic entry points for common work.

## Do not do this

- Do not duplicate the whole PRD into every file.
- Do not restate formulas in every prompt path.
- Do not hide calculations inside AI summaries or UI components.
- Do not use subagents as a substitute for clear architecture.
