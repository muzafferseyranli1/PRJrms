'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Image, FileText, CornerDownRight } from 'lucide-react';
import { MessageItem, AttachmentItem } from '@/lib/types';

interface Props {
  onSendMessage: (content?: string, attachments?: any[], replyToId?: string) => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

const QUICK_EMOJIS = ['😊', '👍', '❤️', '🔥', '🎉', '🚀', '👀', '💯', '👏', '✅', '🤔', '🙏', '🙌', '🤝'];

export default function MessageInput({
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTypingStart,
  onTypingStop,
}: Props) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicator
    onTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSendMessage(
      content.trim() || undefined,
      attachments.length > 0 ? attachments : undefined,
      replyingTo?.id
    );

    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    onCancelReply();
    onTypingStop();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('prjrms_token');
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setAttachments((prev) => [...prev, data]);
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-[#202c33] border-t border-[#222e35] p-3 relative select-none">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-[#111b21] border border-[#2a3942] flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#00a884]/20 text-[#00a884]">
              <CornerDownRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#00a884] truncate">
                {replyingTo.sender.fullName} kişisine yanıt veriliyor
              </p>
              <p className="text-xs text-[#8696a0] truncate">
                {replyingTo.content || 'Ek / Medya'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111b21] border border-[#2a3942] text-xs text-[#e9edef]"
            >
              {att.mimeType.startsWith('image/') ? (
                <Image className="w-3.5 h-3.5 text-[#00a884]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#00a884]" />
              )}
              <span className="max-w-[150px] truncate">{att.fileName}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-0.5 rounded text-[#8696a0] hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40 bg-[#111b21] border border-[#2a3942] rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="grid grid-cols-7 gap-1.5">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  setContent((prev) => prev + em);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-[#202c33] hover:scale-125 transition"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2.5 rounded-xl transition ${
            showEmojiPicker
              ? 'text-[#00a884] bg-[#111b21]'
              : 'text-[#8696a0] hover:text-white hover:bg-[#111b21]'
          }`}
          title="Emoji Ekle"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Attachment Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 rounded-xl text-[#8696a0] hover:text-white hover:bg-[#111b21] transition disabled:opacity-50"
          title="Dosya veya Resim Ekle"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Text Input Area */}
        <div className="flex-1 bg-[#2a3942] rounded-2xl border border-transparent focus-within:border-[#00a884]/40 px-3.5 py-2 transition">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Bir mesaj yazın..."
            className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0]/70 focus:outline-none resize-none max-h-32 leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() && attachments.length === 0}
          className="p-2.5 rounded-2xl bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition shadow-lg shadow-[#00a884]/20 disabled:opacity-40 disabled:hover:bg-[#00a884] flex-shrink-0"
          title="Gönder (Enter)"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
