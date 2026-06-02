# test_checklist — MCP Server for AI Agent Test Checklist

AI agent self-check checklist tool for writing tests. Ported from [opencode](https://github.com/anomalyco/opencode)'s `todowrite`.

## Features

- **In-memory storage** — no disk writes, data lives as long as the MCP server process (tied to opencode session)
- **Multiple checklists** — create independent checklists per test area (widget / unit / navigation)
- **Zero dependencies** — pure Node.js, just run it

## 6 MCP Tools

| Tool | Params | Returns | Purpose |
|------|--------|---------|---------|
| `test_checklist_init` | `name` + `items` | summary | Create/replace a named checklist |
| `test_checklist_check` | `name` + `index` | summary | Mark an item as done |
| `test_checklist_uncheck` | `name` + `index` | summary | Uncheck an item |
| `test_checklist_mark_na` | `name` + `index` | summary | Mark an item N/A |
| `test_checklist_status` | `name` | detailed markdown | View checklist progress |
| `test_checklist_list` | none | list of all checklists | View all active checklists |

> All tools accept optional `name` parameter (default: `"default"`).

## Usage

### Register in opencode config

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "test_checklist": {
      "type": "local",
      "command": ["node", "/path/to/Test-checklist/mcp-server.cjs"],
      "enabled": true
    }
  }
}
```

### ChecklistItem format

```json
{
  "content": "Submit empty form -> all errors shown",
  "checked": false,
  "na": false,
  "category": "Input Stress"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Check item description |
| `checked` | boolean | Done or not |
| `na` | boolean | Not applicable |
| `category` | string? | Group name (optional) |

### Example workflow

```
# Create two checklists
test_checklist_init name="widget" items=[...]
test_checklist_init name="unit" items=[...]

# Check an item
test_checklist_check name="widget" index=0

# Mark N/A
test_checklist_mark_na name="unit" index=2

# View progress
test_checklist_status name="widget"
# -> Checklist [widget]: 3✓ 1— 2⬜ (6 total)

# List all active checklists
test_checklist_list
# -> Active checklists:
# ->   widget: 3✓ 1— 2⬜ (6)
# ->   unit: 4✓ 0— 3⬜ (7)
```

## Data lifecycle

Data is stored **in memory only**. It is lost when the MCP server process exits (when opencode closes). No files are written to disk.
