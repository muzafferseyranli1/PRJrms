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
            // Filter out current user because creator is auto-added
            const others = data.users.filter((u: any) => u.id !== currentUser.id);
            setAllUsers(others);
            // Default select all other team members
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Yeni Sohbet Grubu Oluştur</h2>
              <p className="text-xs text-[#8696a0]">Ekip üyeleri için özel kanal veya grup aç</p>
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Grup Adı <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Mobil Uygulama Ekibi"
              required
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Grup Açıklaması (Opsiyonel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: React Native ve Android geliştirme kanalı"
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
            />
          </div>

          {/* Group Avatar Presets */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Grup İkonu</label>
            <div className="flex items-center gap-2">
              {presetAvatars.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`w-9 h-9 rounded-full border-2 overflow-hidden transition p-0.5 ${
                    avatarUrl === preset || (!avatarUrl && idx === 0)
                      ? 'border-[#00a884] scale-110'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full rounded-full bg-[#202c33]" />
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5 flex items-center justify-between">
              <span>Gruba Eklenecek Üyeler</span>
              <span className="text-[10px] text-[#00a884] font-semibold">{selectedUserIds.length + 1} üye</span>
            </label>

            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#202c33]/50 border border-[#2a3942]">
              {allUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={u.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id}
                        alt={u.fullName}
                        className="w-6 h-6 rounded-full bg-[#111b21]"
                      />
                      <span className="text-xs text-white">{u.fullName}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-[#00a884] border-[#00a884] text-[#111b21]'
                          : 'border-[#8696a0]/50'
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
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8696a0] hover:bg-[#202c33] hover:text-white transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition shadow-lg shadow-[#00a884]/20 flex items-center gap-1.5 disabled:opacity-50"
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
