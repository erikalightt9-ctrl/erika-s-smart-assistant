"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Zap,
  Shield,
  Brain,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ───────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] flex-col"
        style={{
          background: "linear-gradient(135deg, #070f1c 0%, #0a1628 55%, #0e1f38 100%)",
        }}
      >
        {/* Navbar */}
        <nav className="flex items-center gap-3 px-10 py-7">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: "#c9a227" }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-none">My Smart Assistant</div>
            <div className="text-xs leading-none mt-0.5" style={{ color: "#c9a227" }}>
              GDS CAPITAL INC.
            </div>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center px-10 xl:px-16 py-12">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-10 border w-fit"
            style={{
              backgroundColor: "rgba(201,162,39,0.12)",
              borderColor: "rgba(201,162,39,0.28)",
              color: "#c9a227",
            }}
          >
            <Zap className="h-3 w-3" />
            Smart Office Automation
          </div>

          {/* Headline — large and prominent */}
          <h1
            className="font-bold text-white leading-[1.08] mb-7"
            style={{ fontSize: "clamp(2.6rem, 4.2vw, 4rem)" }}
          >
            Your Intelligent
            <br />
            <span style={{ color: "#c9a227" }}>Office Assistant</span>
          </h1>

          {/* Description */}
          <p
            className="leading-relaxed mb-10"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "1.1rem",
              maxWidth: "460px",
              lineHeight: "1.75",
            }}
          >
            One unified platform built to eliminate repetitive, time-consuming
            tasks — driving efficiency, accuracy, and smarter operations.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-6 mb-14">
            {[
              { icon: Shield, text: "Role-based access" },
              { icon: Zap,    text: "Real-time notifications" },
              { icon: Brain,  text: "Claude AI integration" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2.5 text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                <Icon className="h-4 w-4" style={{ color: "#c9a227" }} />
                {text}
              </div>
            ))}
          </div>

          {/* Live Dashboard Preview — clock-in only */}
          <div>
            <p className="text-white/35 text-xs uppercase tracking-widest font-semibold mb-3">
              Live Dashboard Preview
            </p>
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "#0d1b30" }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#febc2e" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#28c840" }} />
                <span
                  className="ml-3 text-xs rounded-md px-3 py-0.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
                >
                  aile · dashboard
                </span>
              </div>

              {/* Clock-in bar only */}
              <div className="p-5">
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.20)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(16,185,129,0.15)" }}
                    >
                      <Clock className="h-5 w-5" style={{ color: "#10b981" }} />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Clocked In — 8:02 AM</div>
                      <div className="text-white/50 text-xs mt-0.5">Erika · Head Office</div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{
                      backgroundColor: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.30)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: "#10b981" }}
                    />
                    <span className="text-xs font-bold" style={{ color: "#10b981" }}>LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 text-xs" style={{ color: "rgba(255,255,255,0.16)" }}>
          © 2025 GDS Capital · Internal System · Confidential
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign-in Form ─────────────────────────────────────── */}
      <div className="flex w-full lg:w-[42%] items-center justify-center bg-background p-8 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#c9a227" }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none">My Smart Assistant</div>
              <div className="text-xs leading-none mt-0.5 text-muted-foreground">GDS CAPITAL INC.</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-muted-foreground mt-1">Welcome back to AILE</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gdscapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: "#0a1628", color: "white" }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            GDS Capital — Confidential Internal System
          </p>
        </div>
      </div>

    </div>
  );
}
