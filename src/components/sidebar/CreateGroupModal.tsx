'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroupId: string) => void;
  currentUser: UserSession;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
  currentUser,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('prjrms_token');
      fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const others = data.users.filter((u: any) => u.id !== currentUser.id);
            setAllUsers(others);
            setSelectedUserIds(others.map((u: any) => u.id));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUserIds((prev) => [...prev, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Lütfen bir grup adı girin.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('prjrms_token');
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          avatarUrl: avatarUrl || undefined,
          memberIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Grup oluşturulamadı');
      }

      onGroupCreated(data.group.id);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const presetAvatars = [
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || 'team1')}`,
    `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name || 'team2')}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'team3')}`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=frontend`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=backend`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-[#e9edef] rounded-3xl w-full max-w-[94vw] sm:max-w-md overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#111b21]">Yeni Sohbet Grubu Oluştur</h2>
              <p className="text-[10px] sm:text-xs text-[#54656f]">Ekip üyeleri için özel kanal aç</p>
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Grup Adı <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Mobil Uygulama Ekibi"
              required
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Grup Açıklaması (Opsiyonel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: React Native ve Android geliştirme kanalı"
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] focus:outline-none transition"
            />
          </div>

          {/* Group Avatar Presets */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Grup İkonu</label>
            <div className="flex items-center gap-2">
              {presetAvatars.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 overflow-hidden transition p-0.5 ${
                    avatarUrl === preset || (!avatarUrl && idx === 0)
                      ? 'border-[#008069] scale-110'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full rounded-full bg-[#f0f2f5]" />
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1 flex items-center justify-between">
              <span>Gruba Eklenecek Üyeler</span>
              <span className="text-[10px] text-[#008069] font-semibold">{selectedUserIds.length + 1} üye</span>
            </label>

            <div className="max-h-32 sm:max-h-36 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[#f0f2f5] border border-[#e9edef]">
              {allUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between p-1.5 sm:p-2 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-white shadow-xs' : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={u.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id}
                        alt={u.fullName}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex-shrink-0"
                      />
                      <span className="text-xs text-[#111b21] truncate">{u.fullName}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#008069] border-[#008069] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#54656f] hover:bg-[#f0f2f5] transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              <span>{loading ? 'Oluşturuluyor...' : 'Grubu Oluştur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
