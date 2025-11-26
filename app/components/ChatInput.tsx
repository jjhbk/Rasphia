"use client";
import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;

  /** optional controlled mode */
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

  // sync internal value when controlled value changes
  useEffect(() => {
    if (isControlled) {
      setInternal(value ?? "");
    }
  }, [value, isControlled]);

  const text = isControlled ? value ?? "" : internal;

  // Auto-resize logic
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

  return (
    <form onSubmit={handleSubmit} className="w-full relative">
        <div className="relative flex items-end gap-2 p-1.5 rounded-[26px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-stone-200 transition-all duration-200 ease-in-out min-h-[52px]">
           <textarea
             ref={textareaRef}
             value={text}
             onChange={(e) => handleChange(e.target.value)}
             rows={1}
             placeholder="Ask Rasphia..."
             className="flex-1 resize-none bg-transparent border-none pl-6 pr-10 py-3 text-sm leading-5 text-stone-800 placeholder-stone-400 focus:ring-0 focus:outline-none max-h-[136px] overflow-y-auto rounded-[26px] custom-scrollbar h-full"
             disabled={isLoading}
             style={{ minHeight: "44px" }}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleSubmit(e);
               }
             }}
           />
           <button
             type="submit"
             disabled={isLoading || !text.trim()}
             className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-full bg-amber-600 text-white hover:bg-amber-700 disabled:bg-stone-200 disabled:cursor-not-allowed transition-all mr-1 shadow-md hover:shadow-lg"
           >
             <Send className="h-4 w-4" />
           </button>
        </div>
    </form>
  );
};

export default ChatInput;
