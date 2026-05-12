import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black px-4">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
        Demo App
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        点击右下角的聊天按钮，试试让 AI 帮你操作页面
      </p>
      <nav className="flex gap-4">
        <Link
          href="/about"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          关于页面
        </Link>
      </nav>
    </div>
  );
}
