"use client";
import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <div className="w-full rounded-[40px] border border-white/80 bg-white/95 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.12)] backdrop-blur">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder="Speak to Rasphia about the person, mood, or ritual..."
          className="flex-1 resize-none rounded-full border border-white/70 bg-white px-5 py-3 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:border-amber-200 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2C1A13] via-[#3F2B22] to-[#6C4C3C] text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
