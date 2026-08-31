'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, Camera, Smile, X, FileText, Image as ImageIcon } from 'lucide-react';
import { MessageItem } from '@/lib/types';

interface Props {
  onSendMessage: (content?: string, attachments?: any[], replyToId?: string) => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😊', '😂', '🔥', '🎉', '🚀', '✅', '🙏', '👀'];

export default function MessageInput({
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTypingStart,
  onTypingStop,
}: Props) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing throttle
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;

    let attachments: any[] = [];

    if (selectedFiles.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));
        if (selectedFiles.length === 1) {
          formData.append('file', selectedFiles[0]);
        }

        const token = localStorage.getItem('prjrms_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.files && Array.isArray(data.files) && data.files.length > 0) {
            attachments = data.files;
          } else if (data.fileUrl) {
            attachments = [
              {
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
              },
            ];
          }
        }
      } catch (err) {
        console.error('File upload error:', err);
      } finally {
        setUploading(false);
      }
    }

    onSendMessage(text.trim() || undefined, attachments.length > 0 ? attachments : undefined, replyingTo?.id);
    setText('');
    setSelectedFiles([]);
    setShowEmojiPicker(false);
    onCancelReply();
    onTypingStop();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="bg-[#f0f2f5] border-t border-[#e9edef] p-2 sm:p-3 select-none relative">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-white border-l-4 border-[#008069] flex items-center justify-between shadow-xs animate-in slide-in-from-bottom-2">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-[#008069]">
              {replyingTo.sender.fullName} kişisine yanıt veriliyor
            </p>
            <p className="text-[11px] sm:text-xs text-[#54656f] truncate mt-0.5">
              {replyingTo.content || 'Ek / Medya'}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Attachments Preview */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#e9edef] text-xs text-[#111b21] flex-shrink-0 shadow-xs"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-[#008069]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#008069]" />
              )}
              <span className="truncate max-w-[100px] text-[11px]">{file.name}</span>
              <button onClick={() => removeFile(idx)} className="text-[#54656f] hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Palette Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-3 bg-white border border-[#e9edef] rounded-2xl p-2 shadow-xl flex items-center gap-1 z-20 animate-in fade-in zoom-in-95">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setText((prev) => prev + emoji)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-[#f0f2f5] active:scale-125 transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-1 sm:gap-1.5">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-xl text-[#54656f] hover:text-[#111b21] hover:bg-white transition flex-shrink-0"
          title="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Regular File/Gallery Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        {/* File Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-[#54656f] hover:text-[#111b21] hover:bg-white transition flex-shrink-0"
          title="Dosya veya Galeri Ekle"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* 📷 Direct Camera Capture Input (Mobile Native Camera Support) */}
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 📷 Direct Camera Capture Button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="p-2 rounded-xl text-[#54656f] hover:text-[#008069] hover:bg-white transition flex-shrink-0"
          title="Fotoğraf Çek (Kamera)"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <div className="flex-1 bg-white rounded-2xl border border-[#e9edef] focus-within:border-[#008069] px-3 py-1.5 transition flex items-center shadow-xs min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Bir mesaj yazın..."
            className="w-full bg-transparent text-xs sm:text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none resize-none max-h-28 leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={uploading || (!text.trim() && selectedFiles.length === 0)}
          className="p-2.5 rounded-full bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/25 flex-shrink-0 disabled:opacity-40 disabled:hover:bg-[#008069]"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
