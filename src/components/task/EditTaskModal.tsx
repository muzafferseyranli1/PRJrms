'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Calendar, User, AlertCircle, RefreshCw } from 'lucide-react';
import { TaskItem, GroupMemberItem, TaskPriority, TaskStatus } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  members: GroupMemberItem[];
}

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  members,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [dueDate, setDueDate] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignedToId(task.assignedToId);
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
      setReopenNote('');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const wasClosed = task.status === 'COMPLETED' || task.status === 'CANCELLED';
  const isReopening = wasClosed && (status === 'PENDING' || status === 'IN_PROGRESS');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedToId) {
      setError('Lütfen görev başlığı ve sorumlu kişiyi seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    const socket = getSocket();
    socket.emit('edit_task', {
      taskId: task.id,
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToId,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      reopenNote: isReopening ? (reopenNote.trim() || 'Görev yönetici tarafından yeniden aktif hale getirildi.') : undefined,
    });

    setLoading(false);
    onClose();
  };

  const priorityOptions: Array<{ id: TaskPriority; label: string; color: string }> = [
    { id: 'LOW', label: 'Düşük', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'MEDIUM', label: 'Normal', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'HIGH', label: 'Yüksek', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'URGENT', label: 'Acil', color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-[#e9edef] rounded-3xl w-full max-w-[94vw] sm:max-w-lg overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#111b21]">Görevi Düzenle</h2>
              <p className="text-[10px] sm:text-xs text-[#54656f]">Detayları, tarihi veya statüyü güncelle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#54656f] hover:text-[#111b21] hover:bg-white transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Görev Başlığı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">Atanan Kişi</label>
              <div className="relative">
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#111b21] focus:outline-none transition appearance-none"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.fullName} {m.user.role === 'ADMIN' ? '(Yönetici)' : ''}
                    </option>
                  ))}
                </select>
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0] pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">Görev Statüsü</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#111b21] focus:outline-none transition"
              >
                <option value="PENDING">Bekliyor (Açık)</option>
                <option value="IN_PROGRESS">Devam Ediyor (Açık)</option>
                <option value="COMPLETED">Tamamlandı (Kapalı)</option>
                <option value="CANCELLED">İptal Edildi (Kapalı)</option>
              </select>
            </div>
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">Bitiş Tarihi ve Saati</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-1.5 text-xs text-[#111b21] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">Öncelik</label>
              <div className="grid grid-cols-4 gap-1">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-semibold border transition text-center ${
                      priority === opt.id
                        ? `${opt.color} border-current ring-2 ring-[#008069]/30`
                        : 'bg-[#f0f2f5] border-transparent text-[#54656f] hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Re-opening notification alert */}
          {isReopening && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#008069]" />
                <span>Görev Yeniden Açılıyor (Gruba Bildirilecek)</span>
              </div>
              <input
                type="text"
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                placeholder="Yeniden açma notu (Örn: Revizyon istendi)..."
                className="w-full bg-white border border-[#e9edef] focus:border-[#008069] rounded-xl px-3 py-1.5 text-xs text-[#111b21] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Açıklama / Detaylar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#111b21] focus:outline-none transition resize-none"
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
              disabled={loading}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
