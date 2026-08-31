'use client';

import React, { useState } from 'react';
import { X, UserPlus, Shield, Mail, Lock, User } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export default function AdminCreateUserModal({ isOpen, onClose, onUserCreated }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('prjrms_token');
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, fullName, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kullanıcı oluşturulamadı');
      }

      onUserCreated();
      onClose();
      setEmail('');
      setFullName('');
      setPassword('123456');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-[#222e35] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222e35] bg-[#202c33]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Yeni Ekip Üyesi Ekle</h2>
              <p className="text-xs text-[#8696a0]">Sisteme yeni kullanıcı davet et / tanımla</p>
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
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Ad Soyad</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Caner Korkmaz"
                required
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caner@prjrms.local"
                required
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Başlangıç Şifresi</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                required
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2 text-sm text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Yetki Rolü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  role === 'MEMBER'
                    ? 'bg-[#00a884]/20 border-[#00a884] text-[#00a884]'
                    : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Ekip Üyesi
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  role === 'ADMIN'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Yönetici (Admin)
              </button>
            </div>
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] transition shadow-lg shadow-[#00a884]/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Oluşturuluyor...' : 'Kullanıcıyı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
