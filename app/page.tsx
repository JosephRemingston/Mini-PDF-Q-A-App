"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [conversations, setConversations] = useState<{ _id: string; title: string; preview?: string; updatedAt: string }[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_API_KEY as string | undefined;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch user info
  async function fetchMe() {
    const res = await fetch("/api/auth/me", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    } else {
      setUser(null);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  // Load saved chat after login
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.conversations)) setConversations(data.conversations);
          // auto-select most recent
          const first = data.conversations?.[0];
          if (first) {
            setActiveConversationId(first._id);
            const one = await fetch(`/api/chat?id=${first._id}`);
            const oneData = await one.json();
            if (Array.isArray(oneData?.conversation?.messages)) setMessages(oneData.conversation.messages);
          } else {
            setMessages([]);
          }
        }
      } catch {}
    })();
  }, [user]);

  // Logout
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  // Upload PDF
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    // avoid bubbling that could trigger other forms
    // @ts-ignore
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-api-key": apiKey || "" },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      alert(`Uploaded and indexed ${data.chunks} chunks`);
    } catch (err: any) {
      alert(err.message || "Upload error");
    } finally {
      setLoading(false);
    }
  }

  // Ask question
  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    // @ts-ignore
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
        },
        body: JSON.stringify({ question, history: messages, conversationId: activeConversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ask failed");
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: data.answer || "" },
      ]);
      setQuestion("");
      // refresh list and active conversation timestamp
      try {
        const list = await fetch("/api/chat");
        if (list.ok) {
          const data = await list.json();
          if (Array.isArray(data.conversations)) setConversations(data.conversations);
        }
      } catch {}
    } catch (err: any) {
      alert(err.message || "Ask error");
    } finally {
      setLoading(false);
    }
  }

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-300">
          <h1 className="text-3xl font-bold text-gray-800">📄 Mini PDF Q&A</h1>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-500 hover:bg-red-600 px-4 py-2 text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Auth */}
        {!user && (
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-md text-white font-semibold transition"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-md text-white font-semibold transition"
            >
              Create Account
            </a>
          </div>
        )}

        {/* Main panel */}
        {user && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-md p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Your Chats</h3>
                <button
                  className="text-xs bg-gray-800 text-white rounded px-2 py-1"
                  onClick={async () => {
                    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New Chat", messages: [] }) });
                    const data = await res.json();
                    if (res.ok && data.conversation?._id) {
                      setActiveConversationId(data.conversation._id);
                      setMessages([]);
                      const list = await fetch("/api/chat");
                      const listData = await list.json();
                      if (Array.isArray(listData.conversations)) setConversations(listData.conversations);
                    }
                  }}
                >New</button>
              </div>
              <div className="flex-1 overflow-auto divide-y">
                {conversations.map((c) => (
                  <button
                    key={c._id}
                    className={`w-full text-left text-sm p-2 rounded ${activeConversationId === c._id ? "bg-gray-100" : "hover:bg-gray-50"}`}
                    onClick={async () => {
                      setActiveConversationId(c._id);
                      const one = await fetch(`/api/chat?id=${c._id}`);
                      const oneData = await one.json();
                      if (Array.isArray(oneData?.conversation?.messages)) setMessages(oneData.conversation.messages);
                    }}
                  >
                    <div className="truncate font-medium text-gray-800">{c.title || c.preview || "Untitled"}</div>
                    {c.preview && (
                      <div className="truncate text-xs text-gray-500">{c.preview}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload */}
            <div className="lg:w-1/4 bg-white rounded-xl shadow-md p-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-700">Upload PDF</h2>
              <form onSubmit={handleUpload} className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="text-black border border-gray-300 rounded-md p-2 text-sm file:bg-gray-200 file:text-gray-700 file:py-1 file:px-3 file:rounded-md cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-md px-4 py-2 transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Upload"}
                </button>
              </form>
            </div>

            {/* Chat */}
            <div className="lg:w-2/4 flex flex-col bg-white rounded-xl shadow-md h-[500px] relative overflow-hidden">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 mb-20">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        m.role === "user"
                          ? "bg-indigo-100 self-end text-gray-800"
                          : "bg-gray-200 self-start text-gray-800"
                      }`}
                    >
                      <span className="font-semibold text-sm">
                        {m.role === "user" ? "You" : "Assistant"}:
                      </span>{" "}
                      <span className="text-sm">{m.content}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleAsk}
                className="absolute bottom-0 left-0 w-full flex p-4 border-t border-gray-300 bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.stopPropagation()}
                  className="flex-1 text-black border border-gray-300 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mr-2"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-2 transition disabled:opacity-50"
                >
                  {loading ? "..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}