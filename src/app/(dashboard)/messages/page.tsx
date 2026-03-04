"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff" }}>
      {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(() =>
    fetch("/api/messages").then((r) => r.json()).then(({ data }) => setConversations(data || [])), []);

  useEffect(() => {
    fetchConversations();
    fetch("/api/staff?limit=50").then((r) => r.json()).then(({ data }) => setAllUsers(data || []));
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    fetch(`/api/messages/${activeConv.partner.id}`)
      .then((r) => r.json())
      .then(({ data }) => { setMessages(data || []); fetchConversations(); });
  }, [activeConv?.partner?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeConv.partner.id, content: newMsg }),
      });
      const { data } = await res.json();
      setMessages((m) => [...m, data]);
      setNewMsg("");
      fetchConversations();
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally { setSending(false); }
  }, [newMsg, activeConv, fetchConversations]);

  const openConv = (c: any) => { setActiveConv(c); setMobileView("chat"); };

  const startNewConversation = (partner: any) => {
    setActiveConv({ partner: { id: partner.id, name: partner.name } });
    setShowNew(false);
    setMobileView("chat");
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-text-main">Messages</span>
          <button onClick={() => setShowNew(true)}
            className="w-8 h-8 rounded-xl bg-accent text-white font-bold text-lg flex items-center justify-center hover:bg-accent/80 transition-colors">
            +
          </button>
        </div>
        <input placeholder="Search…" className="input text-xs py-2 w-full" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <div key={c.partner.id} onClick={() => openConv(c)}
            className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors border-l-2
              ${activeConv?.partner.id === c.partner.id ? "bg-accent/10 border-accent" : "border-transparent hover:bg-surface-alt"}`}>
            <Avatar name={c.partner.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-1">
                <span className="text-[12px] font-bold text-text-main truncate">{c.partner.name?.split(" ")[0]}</span>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <div className="text-[11px] text-text-muted truncate mt-0.5">{c.lastMessage?.content}</div>
            </div>
            {c.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0 self-center">
                {c.unread}
              </div>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <div className="text-text-muted text-xs">No conversations yet.<br />Tap + to start one.</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Chat area ─────────────────────────────────────────────────────────────────
  const chatArea = activeConv ? (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 bg-surface flex-shrink-0">
        <button onClick={() => setMobileView("list")} className="md:hidden text-text-muted hover:text-text-main mr-1 text-xl leading-none">←</button>
        <Avatar name={activeConv.partner.name} size={36} />
        <div>
          <div className="text-[13px] font-bold text-text-main">{activeConv.partner.name}</div>
          <div className="text-[10px] text-success">● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((m) => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed
                ${isMe ? "bg-accent text-white rounded-br-sm" : "bg-surface text-text-main rounded-bl-sm border border-border"}`}>
                {m.content}
                <div className={`text-[9px] mt-1 ${isMe ? "text-white/60 text-right" : "text-text-muted"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm pt-10">No messages yet. Say hello! 👋</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2 flex-shrink-0 bg-surface">
        <input
          ref={inputRef}
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message…"
          className="input flex-1 text-sm"
        />
        <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
          className="btn-primary px-4 text-sm disabled:opacity-50 flex-shrink-0">
          {sending ? "…" : "→"}
        </button>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">💬</div>
        <div className="text-text-muted text-sm">Select a conversation or start a new one</div>
        <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-sm">New Message</button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex w-full h-[calc(100vh-120px)] min-h-[500px] rounded-2xl overflow-hidden border border-border">
        <div className="w-72 flex-shrink-0 bg-surface border-r border-border overflow-hidden">
          {sidebar}
        </div>
        <div className="flex-1 bg-bg overflow-hidden flex flex-col min-w-0">
          {chatArea}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col rounded-2xl border border-border overflow-hidden" style={{ height: "calc(100vh - 112px)" }}>
        {mobileView === "list" ? (
          <div className="flex-1 bg-surface overflow-hidden">{sidebar}</div>
        ) : (
          <div className="flex-1 bg-bg overflow-hidden flex flex-col min-h-0">{chatArea}</div>
        )}
      </div>

      {/* New conversation modal */}
      {showNew && (
        <div onClick={() => setShowNew(false)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="card p-6 w-full max-w-sm">
            <h3 className="text-[15px] font-bold text-text-main mb-4">Start New Conversation</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <div key={u.id} onClick={() => startNewConversation(u)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-alt cursor-pointer transition-colors">
                  <Avatar name={u.name} size={32} />
                  <div>
                    <div className="text-[12px] font-semibold text-text-main">{u.name}</div>
                    <div className="text-[10px] text-text-muted">{u.employee?.department?.name || u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
