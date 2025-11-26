// src/components/ChatSidebar.tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  MessageSquare,
  Search,
  MoreHorizontal,
} from "lucide-react";

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
      ? `/api/chats/search?email=${encodeURIComponent(
          userEmail
        )}&q=${encodeURIComponent(q)}`
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
      {/* HEADER */}
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-800 tracking-wide">
          Conversations
        </h2>
        <button
          onClick={onNew}
          className="p-2 rounded-full hover:bg-white/60 text-stone-600 transition-colors"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* SEARCH */}
      <div className="px-5 pb-4">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400 group-focus-within:text-amber-600 transition-colors" />
          <input
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/40 border border-white/60 focus:border-amber-200 focus:bg-white text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-amber-100/20 transition-all shadow-sm backdrop-blur-sm"
          />
        </form>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
        {chats.map((chat) => (
          <div
            key={chat._id}
            onClick={() => onSelect(chat._id)}
            className={`
              group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all
              ${
                chat._id === activeId
                  ? "bg-white shadow-sm border border-stone-100"
                  : "hover:bg-white/40 border border-transparent"
              }
            `}
          >
            <MessageSquare
              className={`h-4 w-4 flex-shrink-0 ${
                chat._id === activeId ? "text-amber-600" : "text-stone-400"
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
                  className="w-full bg-transparent border-b border-stone-300 text-sm p-0 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className={`text-sm font-medium truncate ${chat._id === activeId ? "text-stone-900" : "text-stone-600"}`}>
                  {chat.title || "New Conversation"}
                </p>
              )}
            </div>

            {/* HOVER ACTIONS */}
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(chat);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50 transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat._id);
                }}
                className="p-1 text-stone-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* FOOTER AREA */}
      <div className="p-4 text-[10px] text-stone-400 text-center opacity-60">
        v1.0.2 • Rasphia
      </div>
    </aside>
  );
}
