import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  Mic,
  Plus,
  LogIn,
  X,
  Download,
  Sparkles,
  ScanLine,
  Tag,
  Camera,
  Image as ImageIcon,
  ScanSearch,
} from "lucide-react";
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
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

  function handleMenuAction(action: "scan" | "camera" | "gallery") {
    setMenuOpen(false);
    if (action === "scan") {
      void navigate({ to: user ? "/vision" : "/auth" });
    } else if (action === "camera") {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
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
          <div className="relative">
            <button
              type="button"
              aria-label="Open actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
            >
              <Plus className={"size-4 transition-transform " + (menuOpen ? "rotate-45" : "")} strokeWidth={2.5} />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-30 cursor-default bg-transparent"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="animate-message absolute bottom-full left-0 z-40 mb-3 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                >
                  <ActionMenuItem
                    icon={ScanSearch}
                    label="Scan pantry, QR code, or receipt"
                    onClick={() => handleMenuAction("scan")}
                  />
                  <ActionMenuItem
                    icon={Camera}
                    label="Take Photo"
                    onClick={() => handleMenuAction("camera")}
                  />
                  <ActionMenuItem
                    icon={ImageIcon}
                    label="Choose from Gallery"
                    onClick={() => handleMenuAction("gallery")}
                  />
                </div>
              </>
            )}
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileSelect}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
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
      <HeroBanner />

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

      <InstallCta />
    </>
  );
}

function HeroBanner() {
  return (
    <section
      className="animate-message relative -mx-1 overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      style={{ animationDelay: "20ms" }}
    >
      <div className="relative">
        <img
          src={heroImg}
          alt="Fresh market table with produce, bread and a phone showing a chat with Taylor"
          width={1024}
          height={1024}
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest opacity-80">
            Meet Taylor
          </p>
          <h2
            className="text-balance text-2xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your AI shopping companion.
          </h2>
          <p className="mt-1 max-w-md text-[13px] leading-snug opacity-90">
            Personal deals. Recipes from what's on special. All in one calm chat — never spam.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
        <Perk icon={Tag} label="Real specials" />
        <Perk icon={Sparkles} label="Recipe ideas" />
        <Perk icon={ScanLine} label="Scan & save" />
      </div>
    </section>
  );
}

function Perk({ icon: Icon, label }: { icon: typeof Tag; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-3">
      <Icon className="size-4 text-primary" strokeWidth={2} />
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </div>
  );
}

function ActionMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="text-pretty leading-snug">{label}</span>
    </button>
  );
}

function InstallCta() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const promptRef = useRef<Event | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) return null;

  async function install() {
    const e = promptRef.current as (Event & { prompt: () => Promise<void> }) | null;
    if (!e) return;
    try {
      await e.prompt();
    } finally {
      setCanInstall(false);
    }
  }

  return (
    <div
      className="animate-message rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5"
      style={{ animationDelay: "360ms" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Download className="size-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Best experience
          </p>
          <h3
            className="mt-0.5 text-lg italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Install Taylor on your phone
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            One tap from your home screen. Full-screen, offline-friendly, and gentle push alerts
            when your favourite specials drop.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canInstall ? (
              <button
                type="button"
                onClick={install}
                className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm transition hover:scale-[1.02]"
              >
                Install now
              </button>
            ) : (
              <span className="rounded-full border border-primary/30 bg-background px-3 py-1.5 text-[11px] text-muted">
                iPhone: tap Share → “Add to Home Screen”
              </span>
            )}
            <span className="text-[10px] text-muted">Free • No ads • Yours to shape</span>
          </div>
        </div>
      </div>
    </div>
  );
}
