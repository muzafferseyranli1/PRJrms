'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Calendar, User, AlertCircle, Clock } from 'lucide-react';
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
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (message) {
      setTitle(message.content ? message.content.slice(0, 80) : 'Görev');
      setDescription(message.content || '');
      setSelectedAssigneeIds(members[0]?.userId ? [members[0].userId] : []);
    }
  }, [message, members]);

  if (!isOpen || !message) return null;

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? (prev.length > 1 ? prev.filter((id) => id !== userId) : prev) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedAssigneeIds.length === 0) {
      setError('Lütfen görev başlığı ve en az bir sorumlu kişi seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    const socket = getSocket();
    socket.emit('create_task', {
      messageId: message.id,
      groupId,
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToId: selectedAssigneeIds[0],
      assigneeIds: selectedAssigneeIds,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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
      <div className="bg-white border border-[#e9edef] rounded-3xl w-full max-w-[94vw] sm:max-w-md overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#111b21]">Mesajı Göreve Dönüştür</h2>
              <p className="text-[10px] sm:text-xs text-[#54656f]">Chat-to-Task Görev Kartı</p>
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

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Görev Başlığı <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Görev için kısa bir başlık..."
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] focus:outline-none transition"
            />
          </div>

          {/* Sorumlular (Çoklu Seçim) */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1.5">
              Görev Sorumluları (Birden Fazla Seçilebilir) <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-[#f0f2f5] rounded-2xl border border-[#e9edef]">
              {members.map((m) => {
                const isSelected = selectedAssigneeIds.includes(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleAssignee(m.userId)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#008069] text-white shadow-xs'
                        : 'bg-white text-[#54656f] border border-[#e9edef] hover:border-[#008069]/40'
                    }`}
                  >
                    <img
                      src={m.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId}`}
                      alt={m.user.fullName}
                      className="w-3.5 h-3.5 rounded-full object-cover"
                    />
                    <span>{m.user.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Bitiş Tarihi & Saati</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-1.5 text-xs text-[#111b21] focus:outline-none transition"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Öncelik Seviyesi</label>
            <div className="grid grid-cols-4 gap-1.5">
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Detaylar / Açıklama</label>
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
              disabled={loading || !title.trim()}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{loading ? 'Oluşturuluyor...' : 'Görevi Başlat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
