"use client";
import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  value?: string;
  onChange?: (v: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  value,
  onChange,
}) => {
  const isControlled = typeof value === "string";
  const [internal, setInternal] = useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isControlled) setInternal(value ?? "");
  }, [value, isControlled]);

  const text = isControlled ? value ?? "" : internal;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (v: string) => {
    if (isControlled && onChange) onChange(v);
    else setInternal(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      if (!isControlled) setInternal("");
      else if (onChange) onChange("");
    }
  };

  const canSend = text.trim().length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-end gap-2 px-4 py-3 rounded-2xl bg-white border border-brand-sand/60 shadow-soft-md transition-all focus-within:border-brand-terracotta/30 focus-within:shadow-soft-lg">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={1}
          placeholder="What's your vibe today?"
          className="flex-1 resize-none bg-transparent border-none p-0 text-sm leading-relaxed text-brand-charcoal placeholder-brand-stone/40 focus:ring-0 focus:outline-none max-h-[120px] overflow-y-auto custom-scrollbar"
          disabled={isLoading}
          style={{ minHeight: "24px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={`flex-shrink-0 h-10 w-10 p-0 inline-flex items-center justify-center rounded-xl transition-all ${
            canSend
              ? "bg-brand-charcoal text-brand-cream hover:bg-brand-warm-black shadow-soft"
              : "bg-brand-sand/40 text-brand-stone/30 cursor-not-allowed"
          }`}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
