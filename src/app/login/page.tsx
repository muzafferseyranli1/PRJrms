'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, MessageSquare, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Giriş başarısız oldu');
      }

      localStorage.setItem('prjrms_token', data.token);
      localStorage.setItem('prjrms_user', JSON.stringify(data.user));
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Giriş işlemi sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('123456');
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 bg-[#f0f2f5] select-none overflow-x-hidden">
      <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-[#008069] text-white shadow-lg shadow-[#008069]/25">
            <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111b21]">PRJrms</h1>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[#008069]/10 text-[#008069] border border-[#008069]/30">
              Chat-to-Task
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#54656f]">
            Ekip İçi Özel Mesajlaşma ve Görev Yönetimi
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#e9edef] rounded-3xl p-5 sm:p-7 shadow-xl shadow-gray-200/50 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">
                E-Posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-[#8696a0]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@prjrms.local"
                  required
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 bg-[#f0f2f5] border border-[#e9edef] rounded-xl text-xs sm:text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:border-[#008069] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#54656f] mb-1">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-[#8696a0]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 bg-[#f0f2f5] border border-[#e9edef] rounded-xl text-xs sm:text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:border-[#008069] focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 px-4 bg-[#008069] hover:bg-[#00705a] text-white font-semibold rounded-xl text-xs sm:text-sm transition duration-150 shadow-md shadow-[#008069]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Section */}
          <div className="pt-3 sm:pt-4 border-t border-[#e9edef] space-y-2.5">
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#54656f]">
              <span className="font-semibold uppercase tracking-wider">Hızlı Ekip Girişi</span>
              <span className="text-[#8696a0]">Şifre: 123456</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@prjrms.local')}
                className="p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] border border-[#e9edef] text-left transition flex items-center gap-2"
              >
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=admin"
                  alt="Admin"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-[#111b21] truncate">Admin</p>
                  <p className="text-[9px] sm:text-[10px] text-[#54656f] truncate">Yönetici</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('ahmet@prjrms.local')}
                className="p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] border border-[#e9edef] text-left transition flex items-center gap-2"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=ahmet"
                  alt="Ahmet"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-[#111b21] truncate">Ahmet Yılmaz</p>
                  <p className="text-[9px] sm:text-[10px] text-[#54656f] truncate">Geliştirici</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('mehmet@prjrms.local')}
                className="p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] border border-[#e9edef] text-left transition flex items-center gap-2"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=mehmet"
                  alt="Mehmet"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-[#111b21] truncate">Mehmet Demir</p>
                  <p className="text-[9px] sm:text-[10px] text-[#54656f] truncate">Geliştirici</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('ayse@prjrms.local')}
                className="p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] border border-[#e9edef] text-left transition flex items-center gap-2"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=ayse"
                  alt="Ayşe"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-[#111b21] truncate">Ayşe Kaya</p>
                  <p className="text-[9px] sm:text-[10px] text-[#54656f] truncate">Geliştirici</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] sm:text-xs text-[#54656f] flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#008069]" />
          <span>Self-Hosted Güvenli İletişim Altyapısı</span>
        </p>
      </div>
    </div>
  );
}
