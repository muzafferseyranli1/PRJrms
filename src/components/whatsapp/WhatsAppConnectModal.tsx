'use client';

import React, { useState, useEffect } from 'react';
import { X, QrCode, Smartphone, CheckCircle2, AlertCircle, RefreshCw, PowerOff, MessageCircle, ShieldCheck } from 'lucide-react';

export interface WhatsAppStatusData {
  status: string;
  qrCodeDataUrl: string | null;
  phone: string | null;
  pushname: string | null;
  lastError: string | null;
  boundGroupId: string | null;
  boundGroupName: string | null;
  boundChatId: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentGroupId: string;
  currentGroupName: string;
  waStatus: WhatsAppStatusData;
  onRefresh: () => void;
}

export default function WhatsAppConnectModal(props: Props) {
  const { isOpen, onClose, currentGroupId, currentGroupName, waStatus, onRefresh } = props;
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [chatId, setChatId] = useState('');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [ok, setOk] = useState(false);
  const [refreshingChats, setRefreshingChats] = useState(false);

  const tok = () => (typeof window !== 'undefined' ? localStorage.getItem('prjrms_token') || '' : '');

  const loadChats = async () => {
    setRefreshingChats(true);
    try {
      const r = await fetch('/api/whatsapp/chats', { headers: { Authorization: 'Bearer ' + tok() } });
      if (r.ok) {
        const d = await r.json();
        setChats(d.chats || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingChats(false);
    }
  };

  useEffect(() => {
    if (isOpen && waStatus.status === 'ready') { loadChats(); }
  }, [isOpen, waStatus.status]);

  if (!isOpen) { return null; }

  const doConnect = async () => {
    setLoading(true);
    await fetch('/api/whatsapp/connect', { method: 'POST', headers: { Authorization: 'Bearer ' + tok() } });
    onRefresh(); setLoading(false);
  };

  const doDisconnect = async () => {
    if (!confirm('Baglantıyı kesmek istediginize emin misiniz?')) return;
    setLoading(true);
    await fetch('/api/whatsapp/disconnect', { method: 'POST', headers: { Authorization: 'Bearer ' + tok() } });
    onRefresh(); setLoading(false);
  };

  const doBind = async (targetId?: string) => {
    const finalChatId = targetId || (showManual ? manualId.trim() : chatId);
    if (!finalChatId) return;
    setLoading(true);
    const r = await fetch('/api/whatsapp/bind-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() },
      body: JSON.stringify({ groupId: currentGroupId, waChatId: finalChatId }),
    });
    if (r.ok) { setOk(true); setTimeout(() => setOk(false), 3000); }
    setLoading(false);
  };

  const s = waStatus.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-green-500 text-white"><MessageCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-bold text-gray-900">WhatsApp Web</p>
              <p className="text-xs text-gray-500">Canli iki yonlu baglanti</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Durum:</span>
              {s === 'ready' && <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Bagli</span>}
              {s === 'qr' && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><QrCode className="w-3 h-3" /> QR Bekliyor</span>}
              {s === 'connecting' && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Baslatiliyor</span>}
              {s === 'disconnected' && <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Bagli Degil</span>}
            </div>
            <button onClick={onRefresh} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          {waStatus.lastError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{waStatus.lastError}</div>
          )}
          {s === 'qr' && waStatus.qrCodeDataUrl && (
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center gap-3">
              <img src={waStatus.qrCodeDataUrl} alt="QR" className="w-52 h-52 bg-white p-2 rounded-xl border" />
              <p className="text-xs font-bold">WhatsApp - Ayarlar - Bagli Cihazlar - Cihaz Bagla</p>
            </div>
          )}
          {s === 'ready' && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800 font-bold text-xs mb-1"><ShieldCheck className="w-4 h-4" />Hesap Eslestirildi</div>
                {waStatus.phone && <p className="text-xs text-gray-600 pl-6">+{waStatus.phone}</p>}
                {waStatus.pushname && <p className="text-xs text-gray-600 pl-6">{waStatus.pushname}</p>}
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-800">
                    "{currentGroupName}" için WhatsApp Grubu:
                  </p>
                  <button
                    onClick={loadChats}
                    disabled={refreshingChats}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#008069] hover:underline"
                    title="Sohbetleri Yeniden Yükle"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingChats ? 'animate-spin' : ''}`} />
                    <span>Yenile</span>
                  </button>
                </div>

                {!showManual ? (
                  <div className="space-y-2">
                    <select
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none"
                    >
                      <option value="">-- Grup Seçiniz ({chats.length} sohbet bulundu) --</option>
                      {chats.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.isGroup ? '👥 Grup: ' : '👤 Kişi: '}{c.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => doBind()}
                        disabled={!chatId || loading}
                        className="px-4 py-2 bg-[#008069] hover:bg-[#00705a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition"
                      >
                        Grubu Eşleştir
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManual(true)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                      >
                        Manuel ID ile Eşle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="WhatsApp Chat ID (örn: 120363... veya 90533...)"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => doBind(manualId.trim())}
                        disabled={!manualId.trim() || loading}
                        className="px-4 py-2 bg-[#008069] hover:bg-[#00705a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition"
                      >
                        Manuel ID Eşleştir
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManual(false)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                      >
                        Listeden Seç
                      </button>
                    </div>
                  </div>
                )}

                {ok && (
                  <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg text-center">
                    ✅ WhatsApp Grubu Başarıyla Eşleştirildi!
                  </p>
                )}

                {chats.length === 0 && (
                  <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                    💡 <b>İpucu:</b> Telefonunuzdaki WhatsApp grubuna herhangi bir mesaj (veya <code>!gorev test</code>) gönderip ardından yukarıdaki <b>Yenile</b> butonuna basarsanız grup otomatik olarak listeye eklenecektir.
                  </div>
                )}
              </div>
            </div>
          )}
          {s === 'disconnected' && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-green-500 mx-auto"><Smartphone className="w-6 h-6" /></div>
              <p className="text-sm font-bold">WhatsApp Oturumu Kapali</p>
              <button onClick={doConnect} disabled={loading} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" />{loading ? "Baslatiliyor..." : "QR Uret ve Bagla"}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {s === 'ready' ? (
              <button onClick={doDisconnect} disabled={loading} className="px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs flex items-center gap-1">
                <PowerOff className="w-3.5 h-3.5" /> Baglantıyı Kes
              </button>
            ) : <span />}
            <button onClick={onClose} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold">Kapat</button>
          </div>
        </div>
      </div>
    </div>
  );
}
