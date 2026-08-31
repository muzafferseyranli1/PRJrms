'use client';

import React, { useEffect, useRef } from 'react';
import { CheckSquare, Reply, Copy, X } from 'lucide-react';
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', onClose);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [onClose]);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    onClose();
  };

  // On mobile: render as a Bottom Sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 animate-in fade-in duration-150">
        <div
          ref={menuRef}
          className="w-full bg-[#111b21] border-t border-[#222e35] rounded-t-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
        >
          {/* Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-[#2a3942] mx-auto mb-3" />

          {/* Quick Emoji Bar */}
          <div className="flex items-center justify-around py-2.5 px-2 bg-[#202c33] rounded-2xl mb-3">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReaction(message.id, emoji);
                  onClose();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-2xl active:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Actions List */}
          <div className="space-y-1">
            <button
              onClick={() => {
                onConvertToTask(message);
                onClose();
              }}
              className="w-full px-4 py-3.5 flex items-center gap-3.5 rounded-xl text-sm font-semibold text-emerald-400 bg-[#00a884]/15 active:bg-[#00a884]/25 transition"
            >
              <CheckSquare className="w-5 h-5 text-[#00a884]" />
              <span>Göreve Dönüştür</span>
            </button>

            <button
              onClick={() => {
                onReply(message);
                onClose();
              }}
              className="w-full px-4 py-3.5 flex items-center gap-3.5 rounded-xl text-sm text-[#e9edef] bg-[#202c33] active:bg-[#2a3942] transition"
            >
              <Reply className="w-5 h-5 text-[#8696a0]" />
              <span>Yanıtla (Alıntıla)</span>
            </button>

            {message.content && (
              <button
                onClick={handleCopy}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 rounded-xl text-sm text-[#e9edef] bg-[#202c33] active:bg-[#2a3942] transition"
              >
                <Copy className="w-5 h-5 text-[#8696a0]" />
                <span>Metni Kopyala</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-xl text-xs font-semibold text-[#8696a0] hover:text-white bg-[#202c33]/50 transition"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop floating context menu
  const adjustedX = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 230 : x);
  const adjustedY = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 270 : y);

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
