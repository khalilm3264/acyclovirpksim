# Tools — Infrastructure Engineer Persona

## Required

- **GitHub MCP** (`mcp__github__*`): Read issues, post comments, manage labels.
- **Repo tools** (Read, Write, Edit, Bash, Grep, Glob): Access to workflows, scripts, and config.

## Common Patterns

### Change a CI workflow
1. Read the issue and the existing files in `.github/workflows/`
2. Edit the workflow (Edit/Write)
3. Validate syntax locally where possible (Bash)
4. Commit changes (Bash — git)
5. Post heartbeat comment with commit SHAs and the run link (GitHub MCP)

### Change deploy configuration
1. Read `wrangler.jsonc` and the deploy workflow
2. Make the smallest change that satisfies the issue
3. Verify with a dry run; never deploy to production
4. Commit and comment, noting how to roll back

### Dependency or tooling update
- Update one tool or dependency per commit
- Run the full test suite before reporting completion

## Optional Tools

Add to `required_tools` in config.yaml as needed:
- `mcp__cloudflare` — Cloudflare Workers / Pages management
- `mcp__context7` — Documentation lookup
