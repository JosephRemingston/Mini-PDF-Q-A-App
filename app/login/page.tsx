"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return "Email is required";
    const re = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!re.test(email)) return "Enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <form onSubmit={onSubmit} className="bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-4 shadow-lg">
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="space-y-2">
            <label className="block text-sm">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded-md border border-white/20 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-white/20 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <button disabled={loading} type="submit" className="w-full rounded-md bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-sm text-gray-300">Don&apos;t have an account? <a className="text-blue-400 hover:underline" href="/signup">Create one</a></p>
      </div>
    </main>
  );
}


