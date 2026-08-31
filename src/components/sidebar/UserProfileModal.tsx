'use client';

import React, { useState } from 'react';
import { X, User, Image, Check } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onProfileUpdated: (user: UserSession) => void;
}

export default function UserProfileModal({ isOpen, onClose, currentUser, onProfileUpdated }: Props) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('prjrms_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Profil güncellenemedi');
      }

      const updated = {
        ...currentUser,
        fullName: data.user.fullName,
        avatarUrl: data.user.avatarUrl,
      };

      localStorage.setItem('prjrms_user', JSON.stringify(updated));
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const presetAvatars = [
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName || 'user1')}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName || 'user2')}`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fullName || 'user3')}`,
    `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(fullName || 'user4')}`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <h2 className="text-base font-semibold text-white">Profil Düzenle</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#202c33] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Avatar Preview & Presets */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={avatarUrl || currentUser.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt={fullName}
              className="w-20 h-20 rounded-full border-2 border-[#00a884] bg-[#202c33] object-cover"
            />
            <div className="flex items-center gap-2">
              {presetAvatars.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`w-9 h-9 rounded-full border-2 overflow-hidden transition p-0.5 ${
                    avatarUrl === preset ? 'border-[#00a884] scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full rounded-full bg-[#202c33]" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Ad Soyad</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Avatar URL (Özel URL)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8696a0] hover:bg-[#202c33] hover:text-white transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
