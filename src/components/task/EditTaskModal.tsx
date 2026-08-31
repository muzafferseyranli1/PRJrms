'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Calendar, User, AlertCircle, Clock, RefreshCw } from 'lucide-react';
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
    { id: 'LOW', label: 'Düşük', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'MEDIUM', label: 'Normal', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'HIGH', label: 'Yüksek', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'URGENT', label: 'Acil', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Görevi Düzenle / Durum Değiştir</h2>
              <p className="text-xs text-[#8696a0]">Görev detaylarını, atanan kişiyi veya tarihi güncelle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Görev Başlığı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Atanan Kişi</label>
              <div className="relative">
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884] appearance-none"
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
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Görev Statüsü</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
              >
                <option value="PENDING">Bekliyor (Açık)</option>
                <option value="IN_PROGRESS">Devam Ediyor (Açık)</option>
                <option value="COMPLETED">Tamamlandı (Kapalı)</option>
                <option value="CANCELLED">İptal Edildi (Kapalı)</option>
              </select>
            </div>
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Bitiş Tarihi ve Saati</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-1.5 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Öncelik</label>
              <div className="grid grid-cols-4 gap-1.5">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-medium border transition text-center ${
                      priority === opt.id
                        ? `${opt.color} border-current ring-1 ring-current`
                        : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Re-opening notification note if changing from closed to open */}
          {isReopening && (
            <div className="p-3 rounded-xl bg-[#00a884]/15 border border-[#00a884]/40 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#00a884] mb-1.5">
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Görev Yeniden Açılıyor (Gruba Otomatik Bildirilecek)</span>
              </div>
              <input
                type="text"
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                placeholder="Yeniden açma sebebi / notu (Örn: Revizyon istendi)..."
                className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl px-3 py-1.5 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Açıklama / Detaylar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884] resize-none"
            />
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
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition shadow-lg shadow-[#00a884]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
