#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DIR = ".test_checklist";
const baseDir = process.env.TEST_CHECKLIST_DATA_DIR || require("os").homedir();
const dir = path.resolve(baseDir, DIR);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function filePath(sid) { return path.join(dir, `${sid.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`); }
function load(sid) { try { return JSON.parse(fs.readFileSync(filePath(sid), "utf-8")).items; } catch { return []; } }
function save(sid, items) { fs.writeFileSync(filePath(sid), JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), "utf-8"); }

function progress(items) {
  const total = items.length, done = items.filter(i => i.checked).length, na = items.filter(i => i.na).length;
  return { total, done, na, remaining: total - done - na };
}
function shortSummary(items) { const p = progress(items); return `Checklist: ${p.done}\u2713 ${p.na}\u2014 ${p.remaining}\u2b1c (${p.total} total)`; }
function fullSummary(items) {
  const p = progress(items);
  if (!items.length) return "No checklist items.";
  const lines = [`Checklist: ${p.done}\u2713 ${p.na}\u2014 ${p.remaining}\u2b1c (${p.total} total)`];
  let lastCat;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.category && item.category !== lastCat) { lines.push(`\n### ${item.category}`); lastCat = item.category; }
    lines.push(`  ${item.checked ? "[\u2713]" : item.na ? "[\u2014]" : "[ ]"} ${item.content}`);
  }
  return lines.join("\n");
}

const TOOLS = [
  {
    name: "test_checklist_init",
    description: `Initialize or replace the entire test checklist. Use once to set up.

The checklist should cover these categories (adapt as needed):

### Widget - Basic Interaction
- Every button / link / list item -> tap it -> verify expected outcome
- Every input field -> valid data -> correct result; invalid data -> correct error
- Initial render -> verify correct first-load state
- Loading state -> indicator visible, element disabled during operation
- Success state -> correct data displayed, correct state transition
- Each failure type -> error visible, recovery path works, retry succeeds
- Invalid input -> each condition independently, multiple simultaneously, error clears on correction
- Empty state placeholder visible when no data
- Overflow -> long content truncated or scrollable
- Null / malformed / partial data -> widget handles without crash

### Widget - Cleanup & Lifecycle
- Timers, streams, listeners disposed when widget unmounts
- Widget rebuilds during animation -> animation continues smoothly

### Unit - Logic & Mocks
- Every public method -> happy path + null/empty input + boundary values + each exception type
- Mock call counts verified
- Cache hit and cache miss both tested

### Navigation & Page Transitions
- A -> B -> back -> A: state, scroll position, form content preserved
- Rapid A->B->A->B navigation: no crash, no stale state
- Navigate during API call: no setState after dispose
- Navigate with unsaved form data: appropriate handling

### Concurrency & Rapid Triggers
- Tap submit x2 rapidly -> only one operation fires
- Tap button 10x during loading -> no duplicate operations
- Operation fails -> immediately retry -> retry succeeds

### Data & Side Effects
- Delete item -> gone from ALL views
- Create item -> appears in all relevant lists
- Toggle on/off -> all dependent UI appears/hides correctly
- Update item -> all cached/displayed copies reflect the update

### Input Stress
- Paste long text (1000+ chars) -> correct truncation or validation error
- Special characters, Unicode, emoji -> display and submit correctly
- Submit empty form -> all validation errors shown simultaneously
- Partially valid form -> valid fields keep values, only invalid fields show errors

### Layout & Reflow
- Content appears -> existing elements shift, nothing covered/clipped
- Content disappears -> remaining elements reflow, no empty gaps
- Keyboard opens -> input fields remain visible

### Modal / Dialog / Overlay
- Open modal -> underlying content not interactive
- Tap overlay background -> modal dismisses or stays, no partial state
- Stacked modals -> dismiss top -> bottom still works

### List & Scroll
- Load more (pagination) -> scroll to bottom -> load more -> no duplicates, no gaps
- Delete item from scrolled list -> remaining items re-index correctly

### Chaos Operations
- Rapid toggle switch 20x -> final state matches last toggle action
- Open/close dialog 10x rapidly -> no memory leak
- Disabled button tapped 10x -> nothing happens

### App Lifecycle & Interruptions
- App background -> foreground mid-operation -> state preserved
- Rapid background/foreground cycling (5x) -> no memory growth

### Timer & Async Safety
- Timer fires after widget disposed -> no crash
- Debounced search: type fast -> only final value fires
- Polling stops or continues by design after navigation

### Network Edge Cases
- Malformed JSON -> graceful error
- Unexpected HTTP status (502/301/429/500) -> appropriate error per status
- Connection drops mid-response -> partial data handled or discarded

### Accessibility
- Every interactive element has a semantic label
- Touch targets >= 48x48 logical pixels
- Screen reader focus follows logical order

### Coverage & Integrity
- Branch tree mapped for each async/interactive operation before writing tests
- No assertions weakened, no tests deleted or commented out to pass`,
    inputSchema: {
      type: "object",
      properties: {
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
    inputSchema: { type: "object", properties: { index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_uncheck",
    description: "Uncheck an item by index (0-based).",
    inputSchema: { type: "object", properties: { index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_mark_na",
    description: "Mark an item as not applicable by index (0-based).",
    inputSchema: { type: "object", properties: { index: { type: "number" } }, required: ["index"] },
  },
  {
    name: "test_checklist_status",
    description: "Get the full checklist with progress and all items.",
    inputSchema: { type: "object", properties: {} },
  },
];

function handleToolCall(name, args, sid) {
  let items;
  switch (name) {
    case "test_checklist_init":
      save(sid, args.items);
      return { content: [{ type: "text", text: shortSummary(load(sid)) }] };
    case "test_checklist_check":
      items = load(sid); if (args.index >= 0 && args.index < items.length) { items[args.index].checked = true; items[args.index].na = false; save(sid, items); }
      return { content: [{ type: "text", text: shortSummary(load(sid)) }] };
    case "test_checklist_uncheck":
      items = load(sid); if (args.index >= 0 && args.index < items.length) { items[args.index].checked = false; save(sid, items); }
      return { content: [{ type: "text", text: shortSummary(load(sid)) }] };
    case "test_checklist_mark_na":
      items = load(sid); if (args.index >= 0 && args.index < items.length) { items[args.index].na = true; items[args.index].checked = false; save(sid, items); }
      return { content: [{ type: "text", text: shortSummary(load(sid)) }] };
    case "test_checklist_status":
      return { content: [{ type: "text", text: fullSummary(load(sid)) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

let buf = "";
const sid = "default";

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
        const result = handleToolCall(params.name, params.arguments || {}, sid);
        respond(id, result);
      } else if (method === "initialize") {
        respond(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "test_checklist", version: "1.0.0" } });
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
