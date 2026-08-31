'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, User, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { MessageItem, GroupMemberItem, TaskPriority } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  message: MessageItem | null;
  members: GroupMemberItem[];
  groupId: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  message,
  members,
  groupId,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setTitle(message.content || 'Mesajdan türetilen görev');
      setDescription(`Orijinal Mesaj: "${message.content || 'Ek / Medya'}"`);
      if (members.length > 0) {
        setAssignedToId(members[0].userId);
      }
      // Default due date: tomorrow at 18:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      setDueDate(tomorrow.toISOString().slice(0, 16));
    }
  }, [message, members]);

  if (!isOpen || !message) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedToId) {
      setError('Lütfen görev başlığı ve sorumlu kişiyi seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    const socket = getSocket();
    socket.emit('create_task', {
      groupId,
      messageId: message.id,
      title: title.trim(),
      description: description.trim(),
      assignedToId,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });

    setLoading(false);
    onClose();
  };

  const priorityOptions: Array<{ id: TaskPriority; label: string; color: string }> = [
    { id: 'LOW', label: 'Düşük', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'MEDIUM', label: 'Normal', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'HIGH', label: 'Yüksek', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'URGENT', label: 'Acil / Kritik', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Mesajdan Görev Oluştur
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-[#00a884]/20 text-[#00a884]">
                  Chat-to-Task
                </span>
              </h2>
              <p className="text-xs text-[#8696a0]">Mesajı ekip görevine dönüştür ve kişiye ata</p>
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
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Original Message Card Reference */}
          <div className="p-3 rounded-xl bg-[#202c33]/60 border border-[#2a3942] flex items-start gap-2.5">
            <img
              src={message.sender.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + message.sender.id}
              alt={message.sender.fullName}
              className="w-7 h-7 rounded-full bg-[#111b21] mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#00a884]">{message.sender.fullName}</p>
              <p className="text-xs text-[#e9edef] line-clamp-2 mt-0.5">{message.content || 'Medya / Dosya eki'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Görev Başlığı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Görev başlığını girin..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
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

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Bitiş Tarihi ve Saati</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-1.5 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Öncelik Derecesi</label>
            <div className="grid grid-cols-4 gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriority(opt.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition text-center ${
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Açıklama / Notlar (Opsiyonel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ek açıklamalar..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-xs text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
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
              <CheckSquare className="w-4 h-4" />
              <span>Görevi Oluştur ve Ata</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
