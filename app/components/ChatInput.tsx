"use client";
import React, { useState } from "react";
import SendIcon from "./icons/SendIcon";

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
    <div className="mt-4 pt-4 border-t border-stone-200">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what you're looking for..."
          className="flex-1 w-full px-4 py-3 bg-white border border-stone-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-12 h-12 flex-shrink-0 bg-amber-800 text-white rounded-full flex items-center justify-center disabled:bg-stone-400 disabled:cursor-not-allowed hover:bg-amber-900 transition-all duration-200 ease-in-out transform hover:scale-105"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
