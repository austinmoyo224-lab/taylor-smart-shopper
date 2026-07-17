import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Mic, Plus, LogIn, X, Download, Sparkles, ScanLine, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell, BottomNav } from "@/components/AppShell";
import sourdoughImg from "@/assets/sample-sourdough.jpg";
import heroImg from "@/assets/chat-hero.jpg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Taylor - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Talk to Taylor, your AI shopping companion. Ask about deals, recipes, or plan your next shop.",
      },
    ],
  }),
  component: ChatScreen,
});

function ChatScreen() {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const conversationIdRef = useRef<string | null>(null);
  const persistedIdsRef = useRef<Set<string>>(new Set());

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Attach the subscriber's bearer so the server can personalise Taylor.
      fetch: async (input, init) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  // Persist messages for authenticated subscribers.
  useEffect(() => {
    if (!user || isLoading || messages.length === 0) return;
    void (async () => {
      if (!conversationIdRef.current) {
        const firstHasImage = messages[0]?.parts.some((p) => p.type === "file");
        const firstText = firstHasImage
          ? "Photo"
          : messages[0]?.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("")
              .slice(0, 80);
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: firstText || "New chat" })
          .select("id")
          .single();
        if (error || !data) return;
        conversationIdRef.current = data.id;
      }
      const cid = conversationIdRef.current;
      const toSave = messages.filter((m) => !persistedIdsRef.current.has(m.id));
      if (toSave.length === 0) return;
      const rows = toSave.map((m) => ({
        conversation_id: cid!,
        user_id: user.id,
        role: m.role as "user" | "assistant",
        parts: m.parts.map((p) =>
          p.type === "file" ? { type: "text", text: "[photo shared]" } : p,
        ) as never,
      }));
      const { error } = await supabase.from("messages").insert(rows);
      if (!error) toSave.forEach((m) => persistedIdsRef.current.add(m.id));
      if (cid) {
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", cid);
      }
    })();
  }, [messages, isLoading, user]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading) return;

    if (attachedFile) {
      const dt = new DataTransfer();
      dt.items.add(attachedFile);
      const files = dt.files;
      setAttachedFile(null);
      setInput("");
      void sendMessage(trimmed ? { text: trimmed, files } : { files });
      return;
    }

    setInput("");
    void sendMessage({ text: trimmed });
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    if (e.target) e.target.value = "";
  }

  const showIntro = messages.length === 0;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-6 pb-4 pt-10 backdrop-blur-md">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              Taylor Intelligence
            </p>
            <h1
              className="text-balance text-3xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {user
                ? `Hi ${user.user_metadata?.first_name ?? user.email?.split("@")[0] ?? ""}`
                : "Good day"}
            </h1>
          </div>
          {user ? (
            <Link
              to="/profile"
              aria-label="Profile"
              className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              T
            </Link>
          ) : (
            <Link
              to="/auth"
              aria-label="Sign in"
              className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary"
            >
              <LogIn className="size-3" />
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-8 overflow-y-auto px-5 py-6 scroll-smooth">
        {showIntro && <IntroMessages />}

        {messages.map((message, i) => (
          <MessageRow key={message.id} role={message.role} parts={message.parts} delay={i * 60} />
        ))}

        {status === "submitted" && (
          <div className="animate-message flex max-w-[85%] flex-col items-start">
            <div className="rounded-2xl rounded-tl-none border border-black/5 bg-surface px-4 py-3">
              <span className="animate-shimmer text-sm leading-relaxed">Taylor is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border bg-background px-4 py-4">
        {attachedFile && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            <span className="max-w-[180px] truncate text-muted">{attachedFile.name}</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-muted hover:text-destructive"
              aria-label="Remove attachment"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <button
            type="button"
            aria-label="Attach photo"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileSelect}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={attachedFile ? "Add a message (optional)…" : "Ask Taylor anything..."}
            aria-label="Message Taylor"
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60 disabled:opacity-60"
          />
          <button
            type="button"
            aria-label="Voice"
            className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
          >
            <Mic className="size-4" strokeWidth={2} />
          </button>
          <button
            type="submit"
            aria-label="Send message"
            disabled={isLoading || (input.trim().length === 0 && !attachedFile)}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </form>

      <BottomNav />
    </AppShell>
  );
}

function MessageRow({
  role,
  parts,
  delay,
}: {
  role: string;
  parts: UIMessage["parts"];
  delay: number;
}) {
  const isUser = role === "user";
  const text = parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const hasFile = parts.some((p) => p.type === "file");

  return (
    <div
      className={"animate-message flex w-full flex-col " + (isUser ? "items-end" : "items-start")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={
          "max-w-[85%] space-y-2 px-4 py-3 " +
          (isUser
            ? "rounded-2xl rounded-tr-none bg-primary text-primary-foreground"
            : "rounded-2xl rounded-tl-none border border-black/5 bg-surface")
        }
      >
        {hasFile && (
          <div className="flex flex-wrap gap-2">
            {parts.map((p, idx) =>
              p.type === "file" ? (
                <img
                  key={idx}
                  src={p.url}
                  alt="Shared photo"
                  className="max-h-48 rounded-lg border border-black/5 object-cover"
                  loading="lazy"
                />
              ) : null,
            )}
          </div>
        )}
        {text && (
          <div
            className={
              isUser
                ? "whitespace-pre-wrap text-sm leading-relaxed"
                : "prose prose-sm max-w-none text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:font-semibold"
            }
          >
            {isUser ? <p>{text}</p> : <ReactMarkdown>{text}</ReactMarkdown>}
          </div>
        )}
      </div>
      <span className="mt-2 font-mono text-[10px] uppercase tracking-tighter text-muted">
        {isUser ? "You" : "Taylor"}
      </span>
    </div>
  );
}

function IntroMessages() {
  return (
    <>
      <div
        className="animate-message flex max-w-[85%] flex-col items-start"
        style={{ animationDelay: "80ms" }}
      >
        <div className="rounded-2xl rounded-tl-none border border-black/5 bg-surface px-4 py-3">
          <p className="text-pretty text-sm leading-relaxed">
            Hi, I'm Taylor. Think of me as your AI shopping companion — I help you keep track of
            specials, recipes and coupons from the stores you follow.
          </p>
        </div>
        <span className="mt-2 font-mono text-[10px] uppercase tracking-tighter text-muted">
          Taylor
        </span>
      </div>

      <div
        className="animate-message flex w-full flex-col items-start"
        style={{ animationDelay: "220ms" }}
      >
        <div className="mb-4 max-w-[85%] rounded-2xl rounded-tl-none border border-black/5 bg-surface px-4 py-3">
          <p className="text-pretty text-sm leading-relaxed">
            Once you follow a store, I'll only share deals that match what you actually buy. Here's
            an example of how a personalised pick looks:
          </p>
        </div>

        <article className="w-full max-w-[92%] overflow-hidden rounded-3xl border border-border bg-card shadow-sm ring-1 ring-black/5">
          <img
            src={sourdoughImg}
            alt="Artisanal sourdough loaf on a wooden kitchen counter"
            width={1024}
            height={768}
            loading="lazy"
            className="aspect-[3/2] w-full object-cover"
          />
          <div className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3
                  className="text-lg italic tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Sample: Artisanal Sourdough
                </h3>
                <p className="text-xs text-muted">Example only — 800g</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">R45.00</p>
                <p className="text-[10px] text-muted line-through">R58.00</p>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-border pt-4">
              <div className="flex items-start gap-3">
                <div className="animate-shimmer mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-[8px] font-bold text-primary">!</span>
                </div>
                <div>
                  <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-tighter text-primary">
                    Why Taylor would pick this
                  </p>
                  <p className="text-[11px] leading-snug text-muted">
                    Once stores are connected, Taylor only shows deals that match your preferences.
                    This card is illustrative — real deals arrive once you follow a store.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <span className="mt-2 font-mono text-[10px] uppercase tracking-tighter text-muted">
          Taylor
        </span>
      </div>
    </>
  );
}
