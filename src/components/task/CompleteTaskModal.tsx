'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-[#e9edef] rounded-3xl w-full max-w-[94vw] sm:max-w-md overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#111b21]">Görevi Tamamla</h2>
              <p className="text-[10px] sm:text-xs text-[#54656f]">Gruba otomatik tamamlama bildirimi gönderilecek</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#54656f] hover:text-[#111b21] hover:bg-white transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Info Pill */}
          <div className="p-3 rounded-2xl bg-[#f0f2f5] border border-[#e9edef]">
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#008069]">Tamamlanan Görev</p>
            <p className="text-xs sm:text-sm font-semibold text-[#111b21] mt-0.5">{task.title}</p>
            {task.description && (
              <p className="text-[11px] text-[#54656f] mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1 flex items-center justify-between">
              <span>Tamamlama Notu / Açıklama <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#54656f]">Zorunlu</span>
            </label>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
              required
              placeholder="Örn: Yapılan değişiklikler test edildi, VPS üzerinde canlıya alındı."
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none resize-none leading-relaxed transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#54656f] hover:bg-[#f0f2f5] transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || !completionNote.trim()}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/20 flex items-center gap-1.5 disabled:opacity-50"
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
