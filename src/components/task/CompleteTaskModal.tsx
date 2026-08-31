'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { TaskItem } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

export default function CompleteTaskModal({ isOpen, onClose, task }: Props) {
  const [completionNote, setCompletionNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionNote.trim()) {
      setError('Lütfen görevi tamamlarken yapılan işlemleri belirten bir tamamlama notu yazın.');
      return;
    }

    setLoading(true);
    setError(null);

    const socket = getSocket();
    socket.emit('update_task_status', {
      taskId: task.id,
      status: 'COMPLETED',
      completionNote: completionNote.trim(),
    });

    setLoading(false);
    setCompletionNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Görevi Tamamla</h2>
              <p className="text-xs text-[#8696a0]">Gruba otomatik tamamlama bildirimi gönderilecek</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Info Pill */}
          <div className="p-3 rounded-xl bg-[#202c33]/60 border border-[#2a3942]">
            <p className="text-[11px] font-semibold text-[#00a884]">Tamamlanan Görev</p>
            <p className="text-sm font-medium text-white mt-0.5">{task.title}</p>
            {task.description && (
              <p className="text-xs text-[#8696a0] mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5 flex items-center justify-between">
              <span>Tamamlama Notu / Açıklama <span className="text-red-400">*</span></span>
              <span className="text-[10px] text-[#8696a0]">Zorunlu</span>
            </label>
            <div className="relative">
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
                required
                placeholder="Örn: Yapılan değişiklikler test edildi, VPS üzerinde canlıya alındı ve doğrulandı."
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-xs text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8696a0] hover:bg-[#202c33] hover:text-white transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || !completionNote.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition shadow-lg shadow-[#00a884]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Tamamla ve Gruba Bildir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
