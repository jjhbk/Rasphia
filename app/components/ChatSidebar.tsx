"use client";
import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, MessageSquare, Search, X, Clock } from "lucide-react";
import BrandLogo from "./brand/BrandLogo";

type ChatItem = {
  _id: string;
  title?: string;
  messages?: { text?: string }[];
  updatedAt?: string;
  createdAt?: string;
};

function relativeTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function groupChats(chats: ChatItem[]) {
  const today: ChatItem[] = [];
  const yesterday: ChatItem[] = [];
  const older: ChatItem[] = [];
  const now = new Date();

  for (const chat of chats) {
    const d = chat.updatedAt ? new Date(chat.updatedAt) : null;
    if (!d) { older.push(chat); continue; }
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    if (diffH < 24) today.push(chat);
    else if (diffH < 48) yesterday.push(chat);
    else older.push(chat);
  }
  return { today, yesterday, older };
}

export default function ChatSidebar({
  userEmail,
  onSelect,
  activeId,
  onNew,
  onDelete,
}: {
  userEmail: string;
  activeId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async (q = "") => {
    const url = q
      ? `/api/chats/search?email=${encodeURIComponent(userEmail)}&q=${encodeURIComponent(q)}`
      : `/api/chats/list?email=${encodeURIComponent(userEmail)}`;
    const res = await fetch(url);
    const data = await res.json();
    setChats(data || []);
  };

  useEffect(() => {
    if (!userEmail) return;
    (async () => { await load(); })();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    const timer = setTimeout(() => load(query), 280);
    return () => clearTimeout(timer);
  }, [query, userEmail]);

  const startEditing = (chat: ChatItem) => {
    setEditingId(chat._id);
    setEditValue(chat.title || "Untitled");
  };

  const saveTitle = async (chatId: string) => {
    if (!editValue.trim()) return;
    setEditingId(null);
    await fetch("/api/chats/update-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, title: editValue }),
    });
    load(query);
  };

  const { today, yesterday, older } = groupChats(chats);

  const renderGroup = (label: string, items: ChatItem[]) => {
    if (!items.length) return null;
    return (
      <div key={label}>
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-brand-stone/40">
          {label}
        </p>
        {items.map((chat) => {
          const isActive = chat._id === activeId;
          const preview = chat.messages?.[chat.messages.length - 1]?.text;
          return (
            <div
              key={chat._id}
              onClick={() => onSelect(chat._id)}
              className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 ${
                isActive
                  ? "bg-white shadow-soft border border-brand-sand/40"
                  : "hover:bg-white/60 border border-transparent"
              }`}
            >
              {/* Active accent */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-terracotta rounded-full" />
              )}

              <MessageSquare
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? "text-brand-terracotta" : "text-brand-stone/30"
                }`}
              />

              <div className="flex-1 min-w-0">
                {editingId === chat._id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveTitle(chat._id)}
                    onKeyDown={(e) => e.key === "Enter" && saveTitle(chat._id)}
                    autoFocus
                    className="w-full bg-transparent border-b border-brand-terracotta/40 text-sm py-0 focus:outline-none text-brand-charcoal"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <p
                      className={`text-sm font-medium truncate leading-tight ${
                        isActive ? "text-brand-charcoal" : "text-brand-stone"
                      }`}
                    >
                      {chat.title || "New conversation"}
                    </p>
                    {preview && !isActive && (
                      <p className="text-[11px] text-brand-stone/40 truncate leading-tight mt-0.5">
                        {preview}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Timestamp (hidden on hover) + action buttons (shown on hover) */}
              <div className="relative flex-shrink-0 flex items-center justify-end min-w-[64px]">
                <span className="text-[10px] text-brand-stone/40 group-hover:invisible transition-opacity whitespace-nowrap">
                  {relativeTime(chat.updatedAt)}
                </span>
                <div className="absolute inset-y-0 right-0 invisible group-hover:visible flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(chat); }}
                    className="h-8 w-8 inline-flex items-center justify-center text-brand-stone/60 hover:text-brand-charcoal rounded-lg hover:bg-brand-parchment transition-colors"
                    aria-label="Rename"
                  >
                    <Pencil className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(chat._id); }}
                    className="h-8 w-8 inline-flex items-center justify-center text-brand-stone/60 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="flex flex-col h-full bg-transparent">
      {/* Brand header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-brand-sand/20">
        <BrandLogo size={22} showWordmark wordmarkClassName="text-[13px] font-semibold" />
        <button
          onClick={onNew}
          className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-brand-charcoal text-brand-cream hover:bg-brand-warm-black transition-colors shadow-soft"
          title="New conversation"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-stone/40" />
          <input
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/50 border border-brand-sand/40 focus:border-brand-terracotta/30 text-[13px] text-brand-charcoal placeholder-brand-stone/40 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/10 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-lg text-brand-stone/50 hover:text-brand-charcoal hover:bg-brand-parchment transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-3 custom-scrollbar space-y-3">
        {chats.length === 0 ? (
          <div className="py-12 text-center px-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-parchment/60 border border-brand-sand/40 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-5 w-5 text-brand-sand" />
            </div>
            <p className="text-sm font-medium text-brand-charcoal/60">
              {query ? "No results found" : "No conversations yet"}
            </p>
            {!query && (
              <p className="text-xs text-brand-stone/40 mt-1">
                Start a new chat to begin shopping
              </p>
            )}
          </div>
        ) : (
          <>
            {renderGroup("Today", today)}
            {renderGroup("Yesterday", yesterday)}
            {renderGroup("Earlier", older)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-brand-sand/20 flex items-center gap-2">
        <Clock className="h-3 w-3 text-brand-stone/30 flex-shrink-0" />
        <p className="text-[11px] text-brand-stone/40">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""}
        </p>
      </div>
    </aside>
  );
}
