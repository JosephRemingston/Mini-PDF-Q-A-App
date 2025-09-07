"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_API_KEY as string | undefined;

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setAnswer("");
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

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
        },
        body: JSON.stringify({ question, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ask failed");
      setAnswer(data.answer || "");
      setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: data.answer || "" }]);
      setQuestion("");
    } catch (err: any) {
      alert(err.message || "Ask error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">📄 Mini PDF Q&A</h1>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="opacity-80">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-500 hover:bg-red-600 px-4 py-2 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Auth Section */}
        {!user && (
          <div className="flex items-center justify-center gap-4">
            <a href="/login" className="rounded-md bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-semibold transition-colors">Sign In</a>
            <a href="/signup" className="rounded-md bg-blue-500 hover:bg-blue-600 px-4 py-2 text-sm font-semibold transition-colors">Create Account</a>
          </div>
        )}

        {/* Upload Form */}
        {user && (
          <form
            onSubmit={handleUpload}
            className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-4 shadow-lg"
          >
            <label className="block text-sm font-medium">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 hover:file:bg-blue-600 file:text-white cursor-pointer"
            />
            <button
              type="submit"
              disabled={!file || loading}
              className="w-full rounded-md bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upload & Index"}
            </button>
          </form>
        )}

        {/* Ask Form */}
        {user && (
          <form
            onSubmit={handleAsk}
            className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-4 shadow-lg"
          >
            <label className="block text-sm font-medium">Ask a question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What does the PDF say about ...?"
              className="w-full rounded-md border border-white/20 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="w-full rounded-md bg-purple-500 hover:bg-purple-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Ask"}
            </button>
          </form>
        )}

        {/* Conversation */}
        {user && messages.length > 0 && (
          <div className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 shadow-lg space-y-3">
            <h2 className="text-lg font-medium">Conversation</h2>
            <div className="space-y-2 max-h-80 overflow-auto pr-2">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-sm" : "text-sm text-gray-200"}>
                  <span className="font-semibold mr-2">{m.role === "user" ? "You" : "Assistant"}:</span>
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}