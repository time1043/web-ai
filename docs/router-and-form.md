# Chatbot-Driven Navigation & Form Control

Two features that let the LLM operate the app UI via tool calling.

## Feature 1: Route Navigation

Chatbot navigates to any page by calling the `navigate` tool.

**User says:** "帮我去到关于页面"
**LLM calls:** `navigate({ path: "/about" })`
**Result:** `router.push("/about")` executes on client

### How it works

1. Tool schema defined in `lib/tools.ts`, execute function in `components/chat-widget.tsx`
2. Server passes tool schemas to DeepSeek as function calling definitions
3. LLM returns tool call → server emits AG-UI events:
   ```
   TOOL_CALL_START → TOOL_CALL_END → CUSTOM "tool-input-available"
   ```
4. `useChat` receives `tool-input-available`, auto-executes the client tool
5. `addToolResult` sends result back → server continues conversation

### Key: CUSTOM event is required

Without the `CUSTOM: tool-input-available` event, `useChat` will NOT auto-execute client tools. This event must be emitted after `TOOL_CALL_END`:

```ts
controller.enqueue(
  sse({
    type: "CUSTOM",
    name: "tool-input-available",
    value: { toolCallId, toolName, input },
  }),
);
```

## Feature 2: Form Operation

Chatbot updates form fields and submits. Uses two tools: `update_signature` and `submit_form`.

**User says:** "将我的个性签名改为汝竟顾念他，并且提交更改"
**LLM calls:** `update_signature({ value: "汝竟顾念他" })` → `submit_form()`
**Result:** Context state updates, form submits

### State flow

```
ChatContext (lib/chat-context.tsx)
  ├── signature / setSignature  ← update_signature tool writes here
  └── submitForm()              ← submit_form tool calls this
        └── registered by the page via registerSubmitHandler()
```

Pages register their submit handlers on mount:

```tsx
// app/about/page.tsx
useEffect(() => {
  registerSubmitHandler(() => {
    setSignature(localSignature); // save to context
    setSubmitted(true); // show feedback
  });
}, []);
```

## Tool Loop (multi-turn)

When the LLM needs multiple tools in sequence:

```
1. POST /api/chat { messages }
   → LLM: navigate({path:"/about"})

2. Client executes navigate → addToolResult
   → POST /api/chat { messages + tool result }
   → LLM: update_signature({value:"汝竟顾念他"})

3. Client executes update_signature → addToolResult
   → POST /api/chat { messages + tool result }
   → LLM: submit_form({})

4. Client executes submit_form → addToolResult
   → POST /api/chat { messages + tool result }
   → LLM: "已完成所有操作。"
```

Each `addToolResult` triggers `checkForContinuation` → `streamResponse` → new POST.

## Message Conversion (server)

When sending messages to DeepSeek, tool results must be extracted correctly:

```ts
// Assistant message with tool calls → OpenAI format
{
  role: "assistant",
  content: "...",
  tool_calls: [{ id, type: "function", function: { name, arguments } }]
}
// Tool results from the output field
{ role: "tool", tool_call_id: "tc1", content: "..." }
```

The `output` field lives on the tool-call part (not in a separate message).

## Client Tool Format

Tools passed to `useChat` must use the `ClientTool` shape (not OpenAI function format):

```ts
{
  __toolSide: "client",
  name: "navigate",
  description: "...",
  inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  execute: async (args) => { /* ... */ return "result string"; },
}
```
