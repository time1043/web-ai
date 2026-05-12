import OpenAI from "openai";
import { randomUUID } from "crypto";
import { toolSchemas } from "@/lib/tools";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const SYSTEM_PROMPT = `你是一个有帮助的AI助手。你可以帮助用户导航页面、修改个性签名和提交表单。
当用户要求你操作页面时，使用提供的工具来完成。完成后简要告知用户结果。
可用页面：/ (首页), /about (关于页面，包含个性签名表单)`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  const runId = randomUUID();
  const timestamp = Date.now();
  const encoder = new TextEncoder();
  const sse = (data: object) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const openaiMessages = convertMessages(messages);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        sse({ type: "RUN_STARTED", runId, model: "deepseek-chat", timestamp }),
      );

      try {
        const completion = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...openaiMessages,
          ],
          tools: toolSchemas,
          stream: true,
        });

        const toolCalls: Map<
          number,
          { id: string; name: string; arguments: string }
        > = new Map();
        const messageId = randomUUID();
        let hasTextContent = false;

        for await (const chunk of completion) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta;

          // Text content
          if (delta?.content) {
            if (!hasTextContent) {
              hasTextContent = true;
              controller.enqueue(
                sse({
                  type: "TEXT_MESSAGE_START",
                  messageId,
                  role: "assistant",
                }),
              );
            }
            controller.enqueue(
              sse({
                type: "TEXT_MESSAGE_CONTENT",
                messageId,
                delta: delta.content,
              }),
            );
          }

          // Tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, {
                  id: tc.id || "",
                  name: tc.function?.name || "",
                  arguments: "",
                });
              }
              const existing = toolCalls.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments)
                existing.arguments += tc.function.arguments;
            }
          }

          // Finish
          if (choice.finish_reason) {
            if (hasTextContent) {
              controller.enqueue(sse({ type: "TEXT_MESSAGE_END", messageId }));
            }

            if (toolCalls.size > 0) {
              for (const [, tool] of toolCalls) {
                let parsedInput = {};
                try {
                  parsedInput = tool.arguments
                    ? JSON.parse(tool.arguments)
                    : {};
                } catch {
                  parsedInput = {};
                }
                controller.enqueue(
                  sse({
                    type: "TOOL_CALL_START",
                    toolCallId: tool.id,
                    toolName: tool.name,
                    toolCallName: tool.name,
                  }),
                );
                controller.enqueue(
                  sse({
                    type: "TOOL_CALL_END",
                    toolCallId: tool.id,
                    toolName: tool.name,
                    toolCallName: tool.name,
                    input: parsedInput,
                  }),
                );
                // Trigger client-side tool execution
                controller.enqueue(
                  sse({
                    type: "CUSTOM",
                    name: "tool-input-available",
                    value: {
                      toolCallId: tool.id,
                      toolName: tool.name,
                      input: parsedInput,
                    },
                  }),
                );
              }
            }
          }
        }

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertMessages(messages: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      const toolResultParts =
        msg.parts?.filter((p: any) => p.type === "tool-result") || [];
      if (toolResultParts.length > 0) {
        for (const part of toolResultParts) {
          result.push({
            role: "tool",
            tool_call_id: part.toolCallId,
            content:
              typeof part.content === "string"
                ? part.content
                : JSON.stringify(part.content),
          });
        }
      } else {
        const textParts =
          msg.parts?.filter((p: any) => p.type === "text") || [];
        const content = textParts.map((p: any) => p.content).join("");
        if (content) result.push({ role: "user", content });
      }
    } else if (msg.role === "assistant") {
      const textParts =
        msg.parts?.filter((p: any) => p.type === "text") || [];
      const toolCallParts =
        msg.parts?.filter((p: any) => p.type === "tool-call") || [];

      if (toolCallParts.length > 0) {
        // Assistant message with tool calls
        result.push({
          role: "assistant",
          content:
            textParts.map((p: any) => p.content).join("") || null,
          tool_calls: toolCallParts.map((p: any) => ({
            id: p.id,
            type: "function",
            function: { name: p.name, arguments: p.arguments },
          })),
        });
        // Extract tool results from tool-call parts (output field)
        for (const part of toolCallParts) {
          if (part.output !== undefined) {
            result.push({
              role: "tool",
              tool_call_id: part.id,
              content:
                typeof part.output === "string"
                  ? part.output
                  : JSON.stringify(part.output),
            });
          }
        }
      } else {
        const content = textParts.map((p: any) => p.content).join("");
        if (content) result.push({ role: "assistant", content });
      }
    }
  }

  return result;
}
