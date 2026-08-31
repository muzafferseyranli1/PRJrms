'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Shield, User, Lock, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('prjrms_token');
    if (token) {
      router.push('/chat');
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Giriş yapılamadı');
      }

      localStorage.setItem('prjrms_token', data.token);
      localStorage.setItem('prjrms_user', JSON.stringify(data.user));
      router.push('/chat');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickUsers = [
    { name: 'Admin', email: 'admin@prjrms.local', role: 'Sistem Yöneticisi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', color: 'from-emerald-500/20 to-teal-500/10' },
    { name: 'Ahmet Yılmaz', email: 'ahmet@prjrms.local', role: 'Geliştirici', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmet', color: 'from-blue-500/20 to-indigo-500/10' },
    { name: 'Mehmet Demir', email: 'mehmet@prjrms.local', role: 'Geliştirici', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mehmet', color: 'from-purple-500/20 to-pink-500/10' },
    { name: 'Ayşe Kaya', email: 'ayse@prjrms.local', role: 'Geliştirici', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ayse', color: 'from-amber-500/20 to-orange-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00a884]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#005c4b]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00a884]/20 border border-[#00a884]/30 mb-4 shadow-lg shadow-[#00a884]/10">
            <MessageSquare className="w-8 h-8 text-[#00a884]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            PRJrms <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30">Chat-to-Task</span>
          </h1>
          <p className="text-sm text-[#8696a0] mt-1">Ekip İçi Özel Mesajlaşma ve Görev Yönetimi</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111b21] border border-[#222e35] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">E-Posta Adresi</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adiniz@prjrms.local"
                  required
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0]/60 focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0]/60 focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#111b21] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-[#222e35]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00a884]" /> Hızlı Ekip Girişi (Demo)
              </span>
              <span className="text-[10px] text-[#8696a0] bg-[#202c33] px-2 py-0.5 rounded">Şifre: 123456</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword('123456');
                    handleLogin(undefined, u.email, '123456');
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#202c33]/70 hover:bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/40 transition text-left group"
                >
                  <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full bg-[#111b21] border border-[#2a3942]" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-white truncate group-hover:text-[#00a884] transition">{u.name}</p>
                    <p className="text-[10px] text-[#8696a0] truncate">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#8696a0] mt-6 flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5 text-[#00a884]" /> Self-Hosted VPS Güvenli İletişim Altyapısı
        </p>
      </div>
    </div>
  );
}
