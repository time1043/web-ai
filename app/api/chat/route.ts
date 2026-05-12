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
            {
              role: "system",
              content: "你是一个有帮助的AI助手，请用中文回答问题。",
            },
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
