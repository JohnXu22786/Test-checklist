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

const TPL = `The checklist should cover these categories (adapt as needed):

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
- No assertions weakened, no tests deleted or commented out to pass`

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
