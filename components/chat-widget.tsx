"use client";

import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { useRef, useEffect, useState } from "react";
import { useChatContext } from "@/lib/chat-context";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const ctx = useChatContext();

  const tools = [
    {
      __toolSide: "client" as const,
      name: "navigate",
      description: "Navigate to a page by path. Available pages: / (home), /about",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "The path to navigate to" },
        },
        required: ["path"],
      },
      execute: async (args: { path: string }) => {
        ctx.navigate(args.path);
        return `Navigated to ${args.path}`;
      },
    },
    {
      __toolSide: "client" as const,
      name: "update_signature",
      description: "Update the user's signature/personal motto on the about page",
      inputSchema: {
        type: "object" as const,
        properties: {
          value: { type: "string", description: "The new signature text" },
        },
        required: ["value"],
      },
      execute: async (args: { value: string }) => {
        ctx.setSignature(args.value);
        return `Signature updated to: ${args.value}`;
      },
    },
    {
      __toolSide: "client" as const,
      name: "submit_form",
      description: "Submit the current form on the page to save changes",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      execute: async () => {
        ctx.submitForm();
        return "Form submitted";
      },
    },
  ];

  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents("/api/chat"),
    tools: tools as any,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isLoading) return;
    sendMessage(input.value);
    input.value = "";
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-2xl"
      >
        {open ? "×" : "💬"}
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI 助手</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-10">有什么可以帮你的？</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {msg.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <p key={i} className="whitespace-pre-wrap">{part.content}</p>;
                    }
                    if (part.type === "tool-call") {
                      return (
                        <p key={i} className="text-xs opacity-60 mt-1">
                          🔧 {part.name}({part.arguments})
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 pb-1">
              <p className="text-xs text-red-500">{error.message}</p>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="输入消息..."
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            {isLoading ? (
              <button type="button" onClick={stop} className="rounded-lg bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                停止
              </button>
            ) : (
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                发送
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
