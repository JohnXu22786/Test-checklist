# test_checklist — MCP Server for AI Agent Test Checklist

AI agent 编写测试文件时的自我检查工具。从 [opencode](https://github.com/anomalyco/opencode) 的 `todowrite` 改造而来。

## Features

- **纯内存存储** — 不写磁盘，数据随 MCP server 生命周期（与 opencode 会话共存）
- **多组 checklist** — 一个会话可创建多个独立清单（widget / unit / navigation 等）
- **5 个 MCP tools** — init（创建）、check（打勾）、uncheck（取消）、mark_na（不适用）、status（查看）、list（列出所有）

## 6 MCP Tools

| Tool | 参数 | 返回 | 用途 |
|------|------|------|------|
| `test_checklist_init` | `name` + `items` | 摘要 | 创建/替换一个命名的 checklist |
| `test_checklist_check` | `name` + `index` | 摘要 | 勾选一项 |
| `test_checklist_uncheck` | `name` + `index` | 摘要 | 取消勾选 |
| `test_checklist_mark_na` | `name` + `index` | 摘要 | 标记不适用 |
| `test_checklist_status` | `name` | 详细 Markdown | 查看指定 checklist 的进展 |
| `test_checklist_list` | 无 | 列表 | 查看所有活跃 checklist |

> 所有工具接受可选 `name` 参数（默认 `"default"`）

## 使用方式

### 注册 opencode 全局配置
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

### ChecklistItem 格式
```ts
interface ChecklistItem {
  content: string       // 检查内容
  checked: boolean      // 是否完成
  na: boolean           // 是否不适用
  category?: string     // 分类名（可选）
}
```

## ChecklistItem 格式

```json
{
  "content": "Submit empty form -> all errors shown",
  "checked": false,
  "na": false,
  "category": "Input Stress"
}
```
