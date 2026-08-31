'use client';

import React, { useState } from 'react';
import { X, User, Settings, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onProfileUpdated: (user: UserSession) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: Props) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [avatarSeed, setAvatarSeed] = useState(currentUser.fullName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('İsim boş olamaz.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('prjrms_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          avatarUrl: currentAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Profil güncellenemedi');
      }

      onProfileUpdated(data.user);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const randomizeAvatar = () => {
    setAvatarSeed(Math.random().toString(36).substring(7));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-[#e9edef] rounded-3xl w-full max-w-[94vw] sm:max-w-md overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#111b21]">Profil Ayarları</h2>
              <p className="text-[10px] sm:text-xs text-[#54656f]">Kullanıcı bilgilerini düzenle</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#008069]" />
              <span>Profil güncellendi!</span>
            </div>
          )}

          {/* Avatar Preview & Randomizer */}
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <div className="relative">
              <img
                src={currentAvatar}
                alt="Avatar"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#008069] bg-[#f0f2f5] shadow-md object-cover"
              />
              <button
                type="button"
                onClick={randomizeAvatar}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#008069] text-white hover:bg-[#00705a] transition shadow"
                title="Yeni Avatar Üret"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-[#54656f]">Avatarı değiştirmek için butona tıklayın</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">Ad Soyad</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#111b21] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#54656f] mb-1">E-Posta (Değiştirilemez)</label>
            <input
              type="text"
              disabled
              value={currentUser.email}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#54656f] hover:bg-[#f0f2f5] transition"
            >
              Kapat
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold bg-[#008069] hover:bg-[#00705a] text-white transition shadow-md shadow-[#008069]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
