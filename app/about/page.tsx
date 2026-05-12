"use client";

import { useEffect, useState } from "react";
import { useChatContext } from "@/lib/chat-context";
import Link from "next/link";

export default function AboutPage() {
  const { signature, setSignature, registerSubmitHandler } = useChatContext();
  const [localSignature, setLocalSignature] = useState(signature);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLocalSignature(signature);
  }, [signature]);

  useEffect(() => {
    registerSubmitHandler(() => {
      setSignature(localSignature);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    });
  }, [localSignature, setSignature, registerSubmitHandler]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← 返回首页
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          关于我
        </h1>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            个性签名
          </label>
          <input
            type="text"
            value={localSignature}
            onChange={(e) => setLocalSignature(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={() => {
              setSignature(localSignature);
              setSubmitted(true);
              setTimeout(() => setSubmitted(false), 2000);
            }}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            提交更改
          </button>

          {submitted && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400 text-center">
              已保存！
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
