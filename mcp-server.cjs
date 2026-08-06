#!/usr/bin/env node
const store = new Map();

function get(name) { return store.get(name) || []; }
function save(name, items) { store.set(name, items); }

function progress(items) {
  const total = items.length, done = items.filter(i => i.checked).length, na = items.filter(i => i.na).length;
  return { total, done, na, remaining: total - done - na };
}
function shortSummary(items) { const p = progress(items); return `Checklist: ${p.done}\u2713 ${p.na}\u2014 ${p.remaining}\u2b1c (${p.total} total)`; }
function fullSummary(name, items) {
  const p = progress(items);
  if (!items.length) return `"${name}" is empty.`;
  const lines = [`Checklist [${name}]: ${p.done}\u2713 ${p.na}\u2014 ${p.remaining}\u2b1c (${p.total} total)`];
  let lastCat;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.category && item.category !== lastCat) { lines.push(`\n### ${item.category}`); lastCat = item.category; }
    lines.push(`  ${item.checked ? "[\u2713]" : item.na ? "[\u2014]" : "[ ]"} ${item.content}`);
  }
  return lines.join("\n");
}

const TPL = `The checklist tracks the tests you actually decided to write — one item per
test, each stating the regression it prevents in one sentence:

- List only planned tests, one item per test
- Behaviors you chose not to test (trivial) are not listed, or marked N/A
- Skipping a test is the default, not a gap to fill; never invent a test to
  fill a checklist item
- Before reporting done, all items must be [x] or [-]`

const TOOLS = [
  {
    name: "test_checklist_init",
    description: `Initialize or replace a named checklist. Use once to set up, then use check/uncheck/mark_na/status with the same name.

Each call needs a unique name (use "widget", "unit", "navigation", or whatever fits). You can have multiple checklists active at once.

${TPL}`,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Checklist name (default: 'default')" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              checked: { type: "boolean" },
              na: { type: "boolean" },
              category: { type: "string" },
            },
            required: ["content", "checked", "na"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "test_checklist_check",
    description: "Mark an item as completed by index (0-based).",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Checklist name (default: 'default')" }, index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_uncheck",
    description: "Uncheck an item by index (0-based).",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Checklist name (default: 'default')" }, index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_mark_na",
    description: "Mark an item as not applicable by index (0-based).",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Checklist name (default: 'default')" }, index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_status",
    description: "Get the full checklist with progress and all items.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Checklist name (default: 'default')" } } },
  },
  {
    name: "test_checklist_list",
    description: "List all active checklist names and their progress.",
    inputSchema: { type: "object", properties: {} },
  },
];

function handleToolCall(name, args) {
  const cname = args.name || "default";
  let items;
  switch (name) {
    case "test_checklist_init":
      save(cname, args.items);
      return { content: [{ type: "text", text: shortSummary(get(cname)) }] };
    case "test_checklist_check":
      items = get(cname); if (args.index >= 0 && args.index < items.length) { items[args.index].checked = true; items[args.index].na = false; save(cname, items); }
      return { content: [{ type: "text", text: shortSummary(get(cname)) }] };
    case "test_checklist_uncheck":
      items = get(cname); if (args.index >= 0 && args.index < items.length) { items[args.index].checked = false; save(cname, items); }
      return { content: [{ type: "text", text: shortSummary(get(cname)) }] };
    case "test_checklist_mark_na":
      items = get(cname); if (args.index >= 0 && args.index < items.length) { items[args.index].na = true; items[args.index].checked = false; save(cname, items); }
      return { content: [{ type: "text", text: shortSummary(get(cname)) }] };
    case "test_checklist_status":
      return { content: [{ type: "text", text: fullSummary(cname, get(cname)) }] };
    case "test_checklist_list":
      if (store.size === 0) return { content: [{ type: "text", text: "No active checklists." }] };
      const lines = [];
      for (const [k, v] of store) {
        const p = progress(v);
        lines.push(`  ${k}: ${p.done}\u2713 ${p.na}\u2014 ${p.remaining}\u2b1c (${p.total})`);
      }
      return { content: [{ type: "text", text: `Active checklists:\n${lines.join("\n")}` }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

let buf = "";

process.stdin.on("data", (chunk) => {
  buf += chunk.toString();
  const lines = buf.split("\n");
  buf = lines.pop() || "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req = JSON.parse(trimmed);
      const id = req.id;
      const method = req.method;
      const params = req.params || {};

      if (method === "tools/list") {
        respond(id, { tools: TOOLS });
      } else if (method === "tools/call") {
        const result = handleToolCall(params.name, params.arguments || {});
        respond(id, result);
      } else if (method === "initialize") {
        respond(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "test_checklist", version: "2.0.0" } });
      } else if (method === "notifications/initialized") {
      } else {
        respond(id, { error: { code: -32601, message: `Method not found: ${method}` } });
      }
    } catch (e) {}
  }
});

function respond(id, result) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, ...result.error ? { error: result.error } : { result } });
  process.stdout.write(msg + "\n");
}
