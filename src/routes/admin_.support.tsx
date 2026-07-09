import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Headphones, Send, User as UserIcon, Sparkles, MessageCircle, Circle, ArrowLeft, CheckCircle2, Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/lib/auth-guard";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { markAdminSeen, useAdminSeen } from "@/lib/support-unread";

type Conv = {
  id: string; customer_id: string; subject: string;
  status: "ai" | "pending" | "human" | "closed";
  last_message_at: string;
};
type Msg = { id: string; sender: "user" | "ai" | "admin"; content: string; created_at: string };
type Profile = { id: string; name: string; email: string };
type Filter = "all" | "unread" | "pending" | "human" | "ai" | "closed";

export const Route = createFileRoute("/admin_/support")({
  head: () => ({ meta: [
    { title: "Support Inbox — GenZ Admin" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: AdminSupport,
});

function AdminSupport() {
  const user = useRequireAuth({ admin: true });
  const [convs, setConvs] = useState<Conv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastCustomerMsgAt, setLastCustomerMsgAt] = useState<Record<string, number>>({});
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const seen = useAdminSeen();

  const reloadConvs = () =>
    supabase.from("support_conversations").select("*").order("last_message_at", { ascending: false })
      .then(({ data }) => setConvs((data ?? []) as Conv[]));

  // Load all conversations + profiles + latest customer msg times
  useEffect(() => {
    if (!user?.isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      const list = (data ?? []) as Conv[];
      setConvs(list);
      const ids = Array.from(new Set(list.map((c) => c.customer_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p as Profile; });
        setProfiles(map);
      }
      // Fetch most-recent non-admin message time per conv for unread computation
      const convIds = list.map((c) => c.id);
      if (convIds.length) {
        const { data: msgs } = await supabase
          .from("support_messages")
          .select("conversation_id,sender,created_at")
          .in("conversation_id", convIds)
          .in("sender", ["user", "ai"])
          .order("created_at", { ascending: false });
        const latest: Record<string, number> = {};
        (msgs ?? []).forEach((m) => {
          if (latest[m.conversation_id]) return;
          latest[m.conversation_id] = new Date(m.created_at).getTime();
        });
        setLastCustomerMsgAt(latest);
      }
    })();
  }, [user]);

  // Realtime updates
  useEffect(() => {
    if (!user?.isAdmin) return;
    const ch = supabase
      .channel("admin-support-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => {
        void reloadConvs();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        const m = payload.new as Msg & { conversation_id: string };
        if (m.sender !== "admin") {
          setLastCustomerMsgAt((prev) => ({ ...prev, [m.conversation_id]: new Date(m.created_at).getTime() }));
        }
        if (m.conversation_id === activeId) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          // Auto-mark seen while viewing
          markAdminSeen(m.conversation_id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeId]);

  // Load messages for active conv & mark seen
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("support_messages").select("*")
        .eq("conversation_id", activeId).order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
      markAdminSeen(activeId);
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const isUnread = (c: Conv) => {
    const last = lastCustomerMsgAt[c.id] ?? new Date(c.last_message_at).getTime();
    return last > (seen[c.id] ?? 0);
  };

  const filteredConvs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return convs.filter((c) => {
      if (filter === "unread" && !isUnread(c)) return false;
      if (filter !== "all" && filter !== "unread" && c.status !== filter) return false;
      if (!needle) return true;
      const p = profiles[c.customer_id];
      return (
        (p?.name?.toLowerCase().includes(needle) ?? false) ||
        (p?.email?.toLowerCase().includes(needle) ?? false) ||
        c.id.toLowerCase().includes(needle) ||
        c.subject.toLowerCase().includes(needle)
      );
    });
  }, [convs, filter, q, profiles, lastCustomerMsgAt, seen]);

  const counts = useMemo(() => ({
    all: convs.length,
    unread: convs.filter(isUnread).length,
    pending: convs.filter((c) => c.status === "pending").length,
    human: convs.filter((c) => c.status === "human").length,
    ai: convs.filter((c) => c.status === "ai").length,
    closed: convs.filter((c) => c.status === "closed").length,
  }), [convs, lastCustomerMsgAt, seen]);

  if (!user?.isAdmin) return null;
  const active = convs.find((c) => c.id === activeId);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !activeId) return;
    setBusy(true);
    if (active && active.status !== "human") {
      await supabase.from("support_conversations").update({ status: "human" }).eq("id", activeId);
    }
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: activeId, sender: "admin", content: text,
    });
    setBusy(false);
    if (error) { toast.error("Failed to send"); return; }
    setReply("");
  };

  const setStatus = async (status: Conv["status"], note?: string) => {
    if (!activeId) return;
    await supabase.from("support_conversations").update({ status }).eq("id", activeId);
    if (note) {
      await supabase.from("support_messages").insert({ conversation_id: activeId, sender: "admin", content: note });
    }
    toast.success(status === "closed" ? "Conversation closed" : "Conversation reopened");
  };

  const statusBadge = (s: Conv["status"]) => {
    const map = {
      ai: { label: "AI", cls: "bg-pop-cyan" },
      pending: { label: "Needs human", cls: "bg-pop-yellow animate-pulse" },
      human: { label: "Live", cls: "bg-pop-pink" },
      closed: { label: "Closed", cls: "bg-muted" },
    };
    const b = map[s];
    return <span className={`chip ${b.cls} text-[10px]`}>{b.label}</span>;
  };

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "pending", label: "Needs human", count: counts.pending },
    { key: "human", label: "Live", count: counts.human },
    { key: "ai", label: "AI", count: counts.ai },
    { key: "closed", label: "Closed", count: counts.closed },
  ];

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="chip bg-pop-pink inline-flex items-center gap-2 mb-2">
              <Headphones size={12} /> Admin · Support Inbox
              {counts.unread > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-ink text-paper text-[9px] font-bold">{counts.unread}</span>}
            </div>
            <h1 className="text-4xl">Customer conversations</h1>
            <p className="text-muted-foreground text-sm mt-1">Search, triage, and reply live. Realtime updates from every device.</p>
          </div>
          <a href="/admin" className="btn-pop inline-flex items-center gap-2 bg-white"><ArrowLeft size={14}/> Back to admin</a>
        </motion.div>

        {/* Filters + search */}
        <div className="sticker rounded-2xl bg-white p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 rounded-xl border-2 border-ink/20">
            <Search size={16}/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, conversation id, subject…"
              className="flex-1 bg-transparent py-2 outline-none text-sm"/>
          </div>
          <div className="flex flex-wrap gap-1">
            {filterTabs.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`chip text-xs ${filter === t.key ? "bg-pop-pink text-white" : ""}`}>
                {t.label} <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-[320px,1fr] gap-4 sticker rounded-2xl overflow-hidden bg-paper">
          {/* List */}
          <aside className="border-r-[3px] border-ink max-h-[70vh] overflow-y-auto">
            {filteredConvs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 opacity-40" /> No conversations match.
              </div>
            )}
            {filteredConvs.map((c) => {
              const p = profiles[c.customer_id];
              const isActive = c.id === activeId;
              const unread = isUnread(c);
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)}
                  className={`w-full text-left p-3 border-b-2 border-ink/10 transition-colors ${isActive ? "bg-pop-yellow" : "hover:bg-pop-yellow/30"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm truncate flex items-center gap-2">
                      {unread && !isActive && <span className="h-2 w-2 rounded-full bg-pop-pink shrink-0" />}
                      {p?.name || "Customer"}
                    </div>
                    {statusBadge(c.status)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p?.email || c.customer_id.slice(0, 8)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Circle size={6} className="fill-current" /> {new Date(c.last_message_at).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Thread */}
          <div className="flex flex-col max-h-[70vh]">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm">Select a conversation to reply.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b-[3px] border-ink flex items-center justify-between bg-pop-cyan/40 flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-sm">{profiles[active.customer_id]?.name || "Customer"}</div>
                    <div className="text-xs text-muted-foreground">{profiles[active.customer_id]?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(active.status)}
                    {active.status === "closed" ? (
                      <button onClick={() => setStatus("human", "Conversation reopened by support.")}
                        className="text-xs font-bold inline-flex items-center gap-1 px-2 py-1 rounded border-2 border-ink bg-white hover:bg-pop-cyan transition-colors">
                        <RotateCcw size={12} /> Reopen
                      </button>
                    ) : (
                      <button onClick={() => setStatus("closed", "Conversation closed by support. Reach out anytime if you need more help!")}
                        className="text-xs font-bold inline-flex items-center gap-1 px-2 py-1 rounded border-2 border-ink bg-white hover:bg-pop-pink transition-colors">
                        <CheckCircle2 size={12} /> Close
                      </button>
                    )}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-paper">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex gap-2 ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      {m.sender !== "admin" && (
                        <div className={`h-7 w-7 shrink-0 rounded-full border-2 border-ink flex items-center justify-center ${m.sender === "ai" ? "bg-pop-cyan" : "bg-white"}`}>
                          {m.sender === "ai" ? <Sparkles size={12}/> : <UserIcon size={12} />}
                        </div>
                      )}
                      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm border-2 border-ink ${
                        m.sender === "admin" ? "bg-pop-pink text-ink rounded-br-sm"
                        : m.sender === "ai" ? "bg-white rounded-bl-sm"
                        : "bg-ink text-paper rounded-bl-sm"
                      }`}>
                        <div className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">
                          {m.sender === "ai" ? "AI" : m.sender === "admin" ? "You" : "Customer"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {m.content}
                      </div>
                      {m.sender === "admin" && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-ink text-paper border-2 border-ink flex items-center justify-center">
                          <Headphones size={12} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); void sendReply(); }}
                  className="p-3 border-t-[3px] border-ink bg-white flex gap-2">
                  <input value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder={active.status === "closed" ? "Reopen to reply" : "Reply as admin…"}
                    disabled={busy || active.status === "closed"}
                    className="flex-1 rounded-lg border-2 border-ink px-3 py-2 text-sm outline-none focus:bg-pop-yellow/20" />
                  <button type="submit" disabled={busy || !reply.trim() || active.status === "closed"}
                    className="h-9 px-4 rounded-lg bg-ink text-paper font-bold text-sm flex items-center gap-1 disabled:opacity-40 hover:bg-pop-pink hover:text-ink transition-colors border-2 border-ink">
                    <Send size={14} /> Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
