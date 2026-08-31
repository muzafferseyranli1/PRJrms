'use client';

import React, { useEffect, useRef } from 'react';
import { CheckSquare, Reply, Copy, Trash2, X } from 'lucide-react';
import { MessageItem, UserSession } from '@/lib/types';

interface Props {
  x: number;
  y: number;
  message: MessageItem;
  currentUser: UserSession;
  onClose: () => void;
  onConvertToTask: (msg: MessageItem) => void;
  onReply: (msg: MessageItem) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (msg: MessageItem) => void;
}

const EMOJIS = ['👍', '❤️', '🔥', '✅', '👀'];

export default function ContextMenu({
  x,
  y,
  message,
  currentUser,
  onClose,
  onConvertToTask,
  onReply,
  onReaction,
  onDeleteMessage,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const canDelete = currentUser.role === 'ADMIN' || message.senderId === currentUser.id;

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

  // Mobile Bottom Sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 animate-in fade-in duration-150">
        <div
          ref={menuRef}
          className="w-full bg-white border-t border-[#e9edef] rounded-t-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />

          {/* Quick Emoji Bar */}
          <div className="flex items-center justify-around py-2.5 px-2 bg-[#f0f2f5] rounded-2xl mb-3">
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
          <div className="space-y-1.5">
            <button
              onClick={() => {
                onConvertToTask(message);
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3.5 rounded-2xl text-sm font-semibold text-emerald-800 bg-emerald-50 active:bg-emerald-100 transition"
            >
              <CheckSquare className="w-5 h-5 text-[#008069]" />
              <span>Göreve Dönüştür</span>
            </button>

            <button
              onClick={() => {
                onReply(message);
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3.5 rounded-2xl text-sm font-medium text-[#111b21] bg-[#f0f2f5] active:bg-[#e9edef] transition"
            >
              <Reply className="w-5 h-5 text-[#54656f]" />
              <span>Yanıtla (Alıntıla)</span>
            </button>

            {message.content && (
              <button
                onClick={handleCopy}
                className="w-full px-4 py-3 flex items-center gap-3.5 rounded-2xl text-sm font-medium text-[#111b21] bg-[#f0f2f5] active:bg-[#e9edef] transition"
              >
                <Copy className="w-5 h-5 text-[#54656f]" />
                <span>Metni Kopyala</span>
              </button>
            )}

            {/* Delete Message */}
            {canDelete && (
              <button
                onClick={() => {
                  onDeleteMessage(message);
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center gap-3.5 rounded-2xl text-sm font-medium text-red-700 bg-red-50 active:bg-red-100 transition"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Mesajı Sil {currentUser.role === 'ADMIN' && message.senderId !== currentUser.id ? '(Yönetici)' : ''}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-[#54656f] hover:text-[#111b21] bg-[#f0f2f5] transition"
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
  const adjustedY = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 280 : y);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 bg-white border border-[#e9edef] rounded-2xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Quick Emoji Reaction Bar */}
      <div className="flex items-center justify-around px-2 py-2 border-b border-[#e9edef] bg-[#f0f2f5]">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReaction(message.id, emoji);
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 hover:bg-white transition"
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
          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-[#008069] hover:bg-emerald-50 transition text-left"
        >
          <CheckSquare className="w-4 h-4 text-[#008069]" />
          <span>Göreve Dönüştür</span>
        </button>

        <button
          onClick={() => {
            onReply(message);
            onClose();
          }}
          className="w-full px-4 py-2 flex items-center gap-3 text-xs text-[#111b21] hover:bg-[#f0f2f5] transition text-left"
        >
          <Reply className="w-4 h-4 text-[#54656f]" />
          <span>Yanıtla (Alıntıla)</span>
        </button>

        {message.content && (
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs text-[#111b21] hover:bg-[#f0f2f5] transition text-left"
          >
            <Copy className="w-4 h-4 text-[#54656f]" />
            <span>Metni Kopyala</span>
          </button>
        )}

        {/* Delete Message Option */}
        {canDelete && (
          <button
            onClick={() => {
              onDeleteMessage(message);
              onClose();
            }}
            className="w-full px-4 py-2 flex items-center gap-3 text-xs text-red-600 hover:bg-red-50 transition text-left border-t border-[#e9edef] mt-1"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Mesajı Sil {currentUser.role === 'ADMIN' && message.senderId !== currentUser.id ? '(Yönetici)' : ''}</span>
          </button>
        )}
      </div>
    </div>
  );
}
