# test_checklist - MCP Server for AI Agent Test Checklist

AI agent writing test files. Ported from [opencode](https://github.com/anomalyco/opencode) todowrite.

Agent creates checklist -> checks off items as done -> marks N/A if not applicable -> verifies all done before submitting.

## 5 MCP Tools

| Tool | Params | Returns | Purpose |
|------|--------|---------|---------|
| `test_checklist_init` | `items: ChecklistItem[]` | summary | Initialize/replace checklist |
| `test_checklist_check` | `index: number` | summary | Check item as done |
| `test_checklist_uncheck` | `index: number` | summary | Uncheck item |
| `test_checklist_mark_na` | `index: number` | summary | Mark item N/A |
| `test_checklist_status` | none | detailed markdown | View all items and progress |

## Usage

### Register in opencode config
In `~/.config/opencode/opencode.json`:

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
```ts
interface ChecklistItem {
  content: string       // description
  checked: boolean      // done or not
  na: boolean           // not applicable
  category?: string     // group name
}
```

## Storage
Data stored in `.test_checklist/` under the project root, one JSON file per session.
