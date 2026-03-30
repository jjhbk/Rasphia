"use client";
import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, MessageSquare, Search } from "lucide-react";

type ChatItem = {
  _id: string;
  title?: string;
  messages?: { text?: string }[];
  updatedAt?: string;
};

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
    load();
  }, [userEmail]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await load(query);
  };

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
    load();
  };

  return (
    <aside className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-brand-stone/70">
          Conversations
        </h2>
        <button
          onClick={onNew}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-charcoal text-brand-cream hover:bg-brand-warm-black transition-colors"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-stone/50" />
          <input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-parchment/60 border border-brand-sand/40 focus:border-brand-terracotta/40 text-xs text-brand-charcoal placeholder-brand-stone/50 focus:outline-none focus:ring-2 focus:ring-brand-terracotta/10 transition-all"
          />
        </form>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar pb-3">
        {chats.length === 0 && (
          <div className="py-10 text-center">
            <MessageSquare className="h-8 w-8 text-brand-sand mx-auto mb-2" />
            <p className="text-xs text-brand-stone/50">No conversations yet</p>
          </div>
        )}
        {chats.map((chat) => {
          const isActive = chat._id === activeId;
          return (
            <div
              key={chat._id}
              onClick={() => onSelect(chat._id)}
              className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                isActive
                  ? "bg-white shadow-soft border border-brand-sand/40"
                  : "hover:bg-white/50 border border-transparent"
              }`}
            >
              <MessageSquare
                className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                  isActive ? "text-brand-terracotta" : "text-brand-stone/40"
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
                    className="w-full bg-transparent border-b border-brand-sand text-xs p-0 focus:outline-none text-brand-charcoal"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p
                    className={`text-xs font-medium truncate transition-colors ${
                      isActive ? "text-brand-charcoal" : "text-brand-stone"
                    }`}
                  >
                    {chat.title || "New conversation"}
                  </p>
                )}
              </div>

              {/* Hover actions */}
              <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(chat); }}
                  className="p-1 text-brand-stone/40 hover:text-brand-charcoal rounded-lg hover:bg-brand-parchment transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(chat._id); }}
                  className="p-1 text-brand-stone/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-brand-sand/30">
        <p className="text-[10px] text-brand-stone/40">
          Rasphia · vibe shopping
        </p>
      </div>
    </aside>
  );
}
