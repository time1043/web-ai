"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface ChatContextValue {
  signature: string;
  setSignature: (v: string) => void;
  navigate: (path: string) => void;
  submitForm: () => void;
  registerSubmitHandler: (fn: () => void) => void;
}

const ChatCtx = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [signature, setSignature] = useState("这个人很懒，什么都没写");
  const submitHandlerRef = useRef<() => void>(() => {});
  const router = useRouter();

  const navigate = useCallback((path: string) => router.push(path), [router]);
  const submitForm = useCallback(() => submitHandlerRef.current(), []);
  const registerSubmitHandler = useCallback((fn: () => void) => {
    submitHandlerRef.current = fn;
  }, []);

  return (
    <ChatCtx.Provider value={{ signature, setSignature, navigate, submitForm, registerSubmitHandler }}>
      {children}
    </ChatCtx.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatContext must be inside ChatProvider");
  return ctx;
}
