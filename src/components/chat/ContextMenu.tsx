'use client';

import React, { useEffect, useRef } from 'react';
import { CheckSquare, Reply, Copy, Smile, Sparkles } from 'lucide-react';
import { MessageItem } from '@/lib/types';

interface Props {
  x: number;
  y: number;
  message: MessageItem;
  onClose: () => void;
  onConvertToTask: (msg: MessageItem) => void;
  onReply: (msg: MessageItem) => void;
  onReaction: (messageId: string, emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '🔥', '✅', '👀'];

export default function ContextMenu({
  x,
  y,
  message,
  onClose,
  onConvertToTask,
  onReply,
  onReaction,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', onClose);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [onClose]);

  // Adjust coordinates so it doesn't overflow viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden py-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Quick Emoji Reaction Bar */}
      <div className="flex items-center justify-around px-2 py-2 border-b border-[#2a3942] bg-[#111b21]/50">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReaction(message.id, emoji);
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 hover:bg-[#202c33] transition"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Action Items */}
      <div className="py-1">
        {/* Core Chat-to-Task Feature */}
        <button
          onClick={() => {
            onConvertToTask(message);
            onClose();
          }}
          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-emerald-400 hover:bg-[#00a884]/15 hover:text-[#00a884] transition text-left"
        >
          <CheckSquare className="w-4 h-4 text-[#00a884]" />
          <span>Göreve Dönüştür</span>
        </button>

        <button
          onClick={() => {
            onReply(message);
            onClose();
          }}
          className="w-full px-4 py-2 flex items-center gap-3 text-xs text-[#e9edef] hover:bg-[#111b21] transition text-left"
        >
          <Reply className="w-4 h-4 text-[#8696a0]" />
          <span>Yanıtla (Alıntıla)</span>
        </button>

        {message.content && (
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs text-[#e9edef] hover:bg-[#111b21] transition text-left"
          >
            <Copy className="w-4 h-4 text-[#8696a0]" />
            <span>Metni Kopyala</span>
          </button>
        )}
      </div>
    </div>
  );
}
