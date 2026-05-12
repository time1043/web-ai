# TanStack AI + DeepSeek Chatbot Setup

## 1. Install Dependencies

```bash
pnpm add @tanstack/ai @tanstack/ai-react @tanstack/ai-openai openai
```

- `@tanstack/ai` — core SDK (message conversion, AG-UI protocol types)
- `@tanstack/ai-react` — `useChat` hook for client-side chat state
- `@tanstack/ai-openai` — OpenAI adapter (types only in this project)
- `openai` — SDK for direct Chat Completions API calls

## 2. Environment Variables

Create `.env.local`:

```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## 3. API Route — `app/api/chat/route.ts`

`@tanstack/ai-openai`'s `createOpenaiChat` uses the **Responses API** (`/v1/responses`), which DeepSeek does not support. Use the `openai` SDK directly with the **Chat Completions API** (`/v1/chat/completions`) instead.

```ts
// Chat Completions API — DeepSeek etc.
this.client.chat.completions.create({
  model: "deepseek-chat",
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello" },
  ],
  stream: true,
});
chunk.choices[0].delta.content; // text
chunk.choices[0].delta.tool_calls; // tool calling

// Responses API — OpenAI only
this.client.responses.create({
  model: "gpt-4o",
  instructions: "You are helpful.",
  input: [{ role: "user", content: "Hello" }],
  stream: true,
});
chunk.type === "response.output_text.delta"; // text
chunk.type === "response.function_call_arguments.delta"; // tool calling
chunk.type === "response.reasoning_text.delta"; // reasoning
// tool: file_search, web_search, code_interpreter, computer_use
```

Stream responses in the [AG-UI protocol](https://docs.ag-ui.com) format — that's what `useChat` expects from SSE:

```ts
import OpenAI from "openai";
import { uiMessageToModelMessages } from "@tanstack/ai";
import { randomUUID } from "crypto";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

export async function POST(request: Request) {
  const { messages } = await request.json();
  const modelMessages = messages.flatMap(uiMessageToModelMessages);

  const runId = randomUUID();
  const messageId = randomUUID();
  const timestamp = Date.now();
  const encoder = new TextEncoder();
  const sse = (data: object) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        sse({ type: "RUN_STARTED", runId, model: "deepseek-chat", timestamp }),
      );
      controller.enqueue(
        sse({ type: "TEXT_MESSAGE_START", messageId, role: "assistant" }),
      );

      try {
        const completion = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            ...modelMessages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          stream: true,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(
              sse({ type: "TEXT_MESSAGE_CONTENT", messageId, delta }),
            );
          }
        }

        controller.enqueue(sse({ type: "TEXT_MESSAGE_END", messageId }));
        controller.enqueue(
          sse({ type: "RUN_FINISHED", runId, timestamp: Date.now() }),
        );
      } catch (err: any) {
        controller.enqueue(
          sse({
            type: "RUN_ERROR",
            runId,
            timestamp: Date.now(),
            error: { message: err.message },
          }),
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### AG-UI Event Flow

```
RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT (×N) → TEXT_MESSAGE_END → RUN_FINISHED
```

## 4. Client Component — `app/page.tsx`

```tsx
"use client";

import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";

export default function Home() {
  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents("/api/chat"),
  });

  // messages: UIMessage[] — each has `id`, `role`, `parts[]`
  // parts: TextPart { type: "text", content } | ThinkingPart { type: "thinking", content } | ...
  // sendMessage(content: string) — sends user message
  // isLoading / error / stop — request state controls
}
```

## Key Notes

- `useChat` sends `UIMessage[]` to the server; use `uiMessageToModelMessages()` to convert to `ModelMessage[]` for the LLM.
- `fetchServerSentEvents("/api/chat")` POSTs JSON `{ messages }` and reads back AG-UI protocol SSE events.
- For OpenAI itself, `createOpenaiChat` from `@tanstack/ai-openai` works out of the box (uses Responses API). No manual SSE wiring needed.
- For any OpenAI-compatible provider (DeepSeek, Ollama, etc.), use the `openai` SDK directly + manual AG-UI SSE events as shown above.
