# test_checklist — MCP Server for AI Agent Test Checklist

AI agent self-check checklist tool for writing tests. Ported from [opencode](https://github.com/anomalyco/opencode)'s `todowrite`.

Agent 编写测试文件时的自我检查清单工具。

## Features / 特性

- **In-memory storage** — no disk writes, data lives as long as the MCP server process (tied to opencode session) / 纯内存存储，不写磁盘
- **Multiple checklists** — create independent checklists per test area (widget / unit / navigation) / 支持多组独立清单
- **Zero dependencies** — pure Node.js / 纯 Node.js，零依赖

## 6 MCP Tools / 工具列表

| Tool / 工具 | Params / 参数 | Returns / 返回 | Purpose / 用途 |
|-------------|---------------|----------------|----------------|
| `test_checklist_init` | `name` + `items` | summary / 摘要 | Create/replace a named checklist / 创建或替换清单 |
| `test_checklist_check` | `name` + `index` | summary / 摘要 | Check an item as done / 标记完成 |
| `test_checklist_uncheck` | `name` + `index` | summary / 摘要 | Uncheck an item / 取消完成 |
| `test_checklist_mark_na` | `name` + `index` | summary / 摘要 | Mark an item N/A / 标记不适用 |
| `test_checklist_status` | `name` | detailed markdown / 详细进度 | View checklist progress / 查看清单进展 |
| `test_checklist_list` | none / 无 | list of all checklists / 所有清单列表 | View all active checklists / 列出所有清单 |

> All tools accept optional `name` parameter (default: `"default"`). / 所有工具接受可选 `name` 参数，默认 `"default"`。

## Usage / 使用方式

### Register in opencode config / 注册到 opencode 配置

Add to `~/.config/opencode/opencode.json`: / 添加到 `~/.config/opencode/opencode.json`：

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

### ChecklistItem format / 数据格式

```json
{
  "content": "Submit empty form -> all errors shown",
  "checked": false,
  "na": false,
  "category": "Input Stress"
}
```

| Field / 字段 | Type / 类型 | Description / 说明 |
|--------------|-------------|-------------------|
| `content` | string | Check item description / 检查条目描述 |
| `checked` | boolean | Done or not / 是否完成 |
| `na` | boolean | Not applicable / 是否不适用 |
| `category` | string? | Group name (optional) / 分类名（可选） |

### Example workflow / 工作流示例

```
# Agent 创建两个清单
test_checklist_init name="widget" items=[...]
test_checklist_init name="unit" items=[...]

# 完成一项
test_checklist_check name="widget" index=0

# 标记不适用
test_checklist_mark_na name="unit" index=2

# 查看进度
test_checklist_status name="widget"
# → Checklist [widget]: 3✓ 1— 2⬜ (6 total)
# →   ...

# 查看所有清单
test_checklist_list
# → Active checklists:
# →   widget: 3✓ 1— 2⬜ (6)
# →   unit: 4✓ 0— 3⬜ (7)
```

## Data lifecycle / 数据生命周期

Data is stored **in memory only**. It is lost when the MCP server process exits (which happens when opencode closes). No files are written to disk.

数据仅存储在内存中。opencode 关闭、MCP server 进程退出时数据即释放。**不会向磁盘写入任何文件。**
