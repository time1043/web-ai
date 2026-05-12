"use client";

import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { useRef, useEffect } from "react";

export default function Home() {
  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents("/api/chat"),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isLoading) return;
    sendMessage(input.value);
    input.value = "";
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          DeepSeek Chat
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Powered by TanStack AI
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-400 dark:text-zinc-600 py-20">
              <p className="text-lg">有什么可以帮你的？</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {msg.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="whitespace-pre-wrap leading-relaxed">
                        {part.content}
                      </p>
                    );
                  }
                  if (part.type === "thinking") {
                    return (
                      <details key={i} className="mb-2">
                        <summary className="text-xs text-zinc-400 cursor-pointer">
                          思考过程
                        </summary>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 whitespace-pre-wrap">
                          {part.content}
                        </p>
                      </details>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2">
            {error.message}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="输入消息..."
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-xl bg-zinc-200 dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              发送
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
