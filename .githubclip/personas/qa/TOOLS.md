# Tools — QA Engineer Persona

## Required

- **GitHub MCP** (`mcp__github__*`): Read issues, post comments, manage labels.
- **Repo tools** (Read, Write, Edit, Bash, Grep, Glob): Access to tests, scripts, and the code under test.

## Common Patterns

### Verify a bug report
1. Read the issue for reproduction steps
2. Reproduce it (Bash) and capture the output
3. Write a failing test that pins the behavior
4. Commit the test and comment with the result; route the fix to the owning persona

### Verify a fix
1. Read the linked change and the original report
2. Run the targeted test, then the full suite (Bash)
3. Comment with the command and pass/fail result

### Add regression coverage
- Follow the existing `tests/*.test.cjs` conventions
- State the reference source and tolerance for any numerical assertion

## Optional Tools

Add to `required_tools` in config.yaml as needed:
- `mcp__plugin_playwright_playwright` — Browser automation for UI checks
- `mcp__context7` — Documentation lookup
