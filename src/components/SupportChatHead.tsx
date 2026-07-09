import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, User as UserIcon, Headphones, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/store";
import { toast } from "sonner";
import { markCustomerSeen, useCustomerSeen } from "@/lib/support-unread";

type Status = "ai" | "pending" | "human" | "closed";
type Msg = { id: string; sender: "user" | "ai" | "admin"; content: string; created_at: string };

export function SupportChatHead() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("ai");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seen = useCustomerSeen(user?.id);

  const eligible = !!user && !user.isAdmin;

  // On mount (once eligible): find most-recent conversation (any status) and
  // subscribe so unread badge updates even when the panel is closed.
  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setConvId(data.id);
        setStatus(data.status as Status);
        const { data: msgs } = await supabase.from("support_messages").select("*")
          .eq("conversation_id", data.id).order("created_at", { ascending: true });
        if (!cancelled) setMessages((msgs ?? []) as Msg[]);
      }
    })();
    return () => { cancelled = true; };
  }, [eligible, user?.id]);

  // Realtime for the tracked conversation (even when panel closed)
  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`support-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "support_conversations",
        filter: `id=eq.${convId}`,
      }, (payload) => {
        setStatus((payload.new as { status: Status }).status);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId]);

  // Unread = admin messages after lastSeen for this conv
  const unread = useMemo(() => {
    if (!convId || !user) return 0;
    const last = seen[convId] ?? 0;
    return messages.filter((m) => m.sender === "admin" && new Date(m.created_at).getTime() > last).length;
  }, [messages, convId, seen, user]);

  // Mark seen when panel opens (or new messages arrive while open)
  useEffect(() => {
    if (open && convId && user) markCustomerSeen(user.id, convId);
  }, [open, convId, user, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open, busy]);

  if (!eligible) return null;

  // Ensure a live conversation exists (used by send/escalate/start-new)
  const ensureConv = async (): Promise<string | null> => {
    if (convId && status !== "closed") return convId;
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({ customer_id: user!.id, subject: "Support chat", status: "ai" })
      .select().single();
    if (error || !data) { toast.error("Could not start chat"); return null; }
    await supabase.from("support_messages").insert({
      conversation_id: data.id, sender: "ai",
      content: `Hey ${user!.name.split(" ")[0] || "there"}! 👋 I'm Z, your GenZ concierge. Ask me about sizing, shipping, or drops — or tap "Talk to a human" to reach the team.`,
    });
    setConvId(data.id);
    setStatus("ai");
    setMessages([]);
    return data.id;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const id = await ensureConv();
    if (!id) return;
    setInput(""); setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: id, sender: "user", content: text,
    });
    if (error) { toast.error("Message failed"); setBusy(false); return; }

    if (status === "ai") {
      try {
        const history = [...messages, { id: "tmp", sender: "user" as const, content: text, created_at: "" }]
          .filter((m) => m.sender !== "admin")
          .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content }));
        const res = await fetch("/api/chat-support", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        const data = await res.json();
        if (data.text) {
          await supabase.from("support_messages").insert({
            conversation_id: id, sender: "ai", content: data.text,
          });
        }
      } catch {
        toast.error("AI is offline — try escalating to a human.");
      }
    }
    setBusy(false);
  };

  const escalate = async () => {
    const id = await ensureConv();
    if (!id) return;
    await supabase.from("support_conversations").update({ status: "pending" }).eq("id", id);
    await supabase.from("support_messages").insert({
      conversation_id: id, sender: "ai",
      content: "Got it — I've flagged this for a human. An admin will jump in shortly. 🙌",
    });
    setStatus("pending");
  };

  const startNew = async () => {
    // Force a fresh conversation
    setConvId(null); setStatus("ai"); setMessages([]);
    const { data } = await supabase
      .from("support_conversations")
      .insert({ customer_id: user!.id, subject: "Support chat", status: "ai" })
      .select().single();
    if (!data) return;
    await supabase.from("support_messages").insert({
      conversation_id: data.id, sender: "ai",
      content: `Welcome back, ${user!.name.split(" ")[0] || "friend"}! How can I help?`,
    });
    setConvId(data.id);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="bubble"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-ink text-paper shadow-[0_8px_0_rgba(0,0,0,0.15)] border-[3px] border-ink flex items-center justify-center hover:bg-pop-pink hover:text-ink transition-colors"
            aria-label={unread > 0 ? `Open support chat (${unread} unread)` : "Open support chat"}
          >
            <MessageCircle size={22} />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pop-pink text-ink border-2 border-ink text-[10px] font-bold grid place-items-center">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-pop-yellow border-2 border-ink" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="win"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-5 right-5 z-40 w-[min(94vw,380px)] h-[min(80vh,560px)] rounded-2xl border-[3px] border-ink bg-paper shadow-[8px_8px_0_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
            role="dialog" aria-label="Support chat"
          >
            <div className="flex items-center justify-between p-3 border-b-[3px] border-ink bg-pop-yellow">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-ink text-paper flex items-center justify-center border-2 border-ink">
                  {status === "human" || status === "pending" ? <Headphones size={16} /> : <Sparkles size={16} />}
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-sm">
                    {status === "human" ? "Support (Human)" : status === "pending" ? "Connecting…" : status === "closed" ? "Conversation closed" : "Z · AI Concierge"}
                  </div>
                  <div className="text-[10px] text-ink/70 font-semibold uppercase tracking-wide">
                    {status === "human" ? "Live agent online" : status === "pending" ? "Waiting for admin" : status === "closed" ? "Start a new chat" : "AI · usually instant"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-ink/10" aria-label="Close chat">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-paper">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <MessageCircle className="mx-auto mb-2 opacity-40" />
                  Send a message to get started.
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {m.sender !== "user" && (
                    <div className={`h-7 w-7 shrink-0 rounded-full border-2 border-ink flex items-center justify-center text-[10px] ${m.sender === "admin" ? "bg-pop-pink" : "bg-pop-cyan"}`}>
                      {m.sender === "admin" ? <Headphones size={12} /> : <Sparkles size={12} />}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm border-2 border-ink ${
                    m.sender === "user" ? "bg-ink text-paper rounded-br-sm"
                    : m.sender === "admin" ? "bg-pop-pink text-ink rounded-bl-sm"
                    : "bg-white text-ink rounded-bl-sm"
                  }`}>
                    {m.content}
                  </div>
                  {m.sender === "user" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-ink text-paper border-2 border-ink flex items-center justify-center">
                      <UserIcon size={12} />
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-pop-cyan border-2 border-ink flex items-center justify-center">
                    <Sparkles size={12} />
                  </div>
                  <div className="rounded-2xl px-3 py-2 text-sm border-2 border-ink bg-white flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> thinking…
                  </div>
                </div>
              )}
            </div>

            {status === "ai" && convId && (
              <div className="px-3 py-2 border-t-2 border-ink/10 bg-paper">
                <button onClick={escalate} className="w-full text-xs font-bold py-2 rounded-lg border-2 border-ink bg-white hover:bg-pop-pink transition-colors inline-flex items-center justify-center gap-2">
                  <Headphones size={12} /> Talk to a human
                </button>
              </div>
            )}

            {status === "closed" ? (
              <div className="p-3 border-t-[3px] border-ink bg-white">
                <button onClick={startNew} className="w-full h-10 rounded-lg bg-ink text-paper font-bold text-sm flex items-center justify-center gap-2 hover:bg-pop-pink hover:text-ink transition-colors border-2 border-ink">
                  <Plus size={14}/> Start a new conversation
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); void send(); }}
                className="p-3 border-t-[3px] border-ink bg-white flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message…"
                  disabled={busy}
                  className="flex-1 rounded-lg border-2 border-ink px-3 py-2 text-sm outline-none focus:bg-pop-yellow/20"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="h-9 w-9 rounded-lg bg-ink text-paper flex items-center justify-center disabled:opacity-40 hover:bg-pop-pink hover:text-ink transition-colors border-2 border-ink"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
