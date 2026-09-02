'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PowerOff,
  MessageCircle,
  ShieldCheck,
  Search,
  Users,
  User,
  PlusCircle,
  Link as LinkIcon,
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'groups' | 'contacts'>('all');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
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
    if (isOpen && waStatus.status === 'ready') {
      loadChats();
    }
  }, [isOpen, waStatus.status]);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const doConnect = async () => {
    setLoading(true);
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST', headers: { Authorization: 'Bearer ' + tok() } });
      onRefresh();
    } catch (e) {}
    setLoading(false);
  };

  const doDisconnect = async () => {
    if (!confirm('WhatsApp bağlantısını kesmek istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST', headers: { Authorization: 'Bearer ' + tok() } });
      onRefresh();
    } catch (e) {}
    setLoading(false);
  };

  // Mevcut PRJrms grubunu seçilen WhatsApp sohbeti ile eşleştir
  const doBindToCurrentGroup = async (waChatId: string, chatName: string) => {
    if (!waChatId) return;
    setLoading(true);
    try {
      const r = await fetch('/api/whatsapp/bind-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() },
        body: JSON.stringify({ groupId: currentGroupId, waChatId }),
      });
      if (r.ok) {
        showFeedback(`"${currentGroupName}" grubu "${chatName}" ile eşleştirildi!`);
        await loadChats();
        onRefresh();
      } else {
        showFeedback('Eşleştirme başarısız oldu.', 'error');
      }
    } catch (e) {
      showFeedback('Bağlantı hatası.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp sohbeti için yeni bağımsız bir PRJrms kanalı oluştur
  const doCreateNewChannel = async (waChatId: string, chatName: string, isGroup: boolean) => {
    if (!waChatId) return;
    setLoading(true);
    try {
      const r = await fetch('/api/whatsapp/create-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() },
        body: JSON.stringify({ waChatId, name: chatName, isGroup }),
      });
      if (r.ok) {
        showFeedback(`"${chatName}" için yeni PRJrms kanalı açıldı ve bağlandı!`);
        await loadChats();
        onRefresh();
      } else {
        showFeedback('Kanal oluşturulamadı.', 'error');
      }
    } catch (e) {
      showFeedback('Kanal oluşturma hatası.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.number && c.number.includes(searchTerm)) ||
      c.id.includes(searchTerm);

    if (!matchSearch) return false;
    if (filterTab === 'groups') return c.isGroup;
    if (filterTab === 'contacts') return !c.isGroup;
    return true;
  });

  const groupCount = chats.filter((c) => c.isGroup).length;
  const contactCount = chats.filter((c) => !c.isGroup).length;
  const s = waStatus.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]">
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#25D366] text-white shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">WhatsApp Entegrasyonu & Görev Yönetimi</h2>
              <p className="text-[11px] text-gray-500">Tüm Gruplar ve Birebir Yazışmalar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Bağlantı Durumu */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Oturum:</span>
              {s === 'ready' && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı ve Aktif
                </span>
              )}
              {s === 'qr' && (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <QrCode className="w-3.5 h-3.5" /> QR Bekliyor
                </span>
              )}
              {s === 'connecting' && (
                <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Başlatılıyor...
                </span>
              )}
              {s === 'disconnected' && (
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Bağlantı Yok
                </span>
              )}
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 text-gray-600 hover:bg-white rounded-xl border border-gray-200 transition"
              title="Durumu Yenile"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {waStatus.lastError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{waStatus.lastError}</span>
            </div>
          )}

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium text-center transition ${
                statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* QR Kod Görünümü */}
          {s === 'qr' && waStatus.qrCodeDataUrl && (
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center gap-3">
              <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                <img src={waStatus.qrCodeDataUrl} alt="WhatsApp QR" className="w-52 h-52 object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Telefonunuzdan Okutun</p>
                <p className="text-[11px] text-gray-500 mt-0.5">WhatsApp &gt; Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla</p>
              </div>
            </div>
          )}

          {/* Bağlı Durumda Sohbet & Kişi Listesi */}
          {s === 'ready' && (
            <div className="space-y-3.5">
              {/* Hesap Bilgisi */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">{waStatus.pushname || 'WhatsApp Hesabı'}</p>
                    {waStatus.phone && <p className="text-emerald-700">+{waStatus.phone}</p>}
                  </div>
                </div>
                <button
                  onClick={loadChats}
                  disabled={refreshingChats}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingChats ? 'animate-spin' : ''}`} />
                  <span>Sohbetleri Yenile</span>
                </button>
              </div>

              {/* Sekmeler & Arama */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Grup, personel veya telefon ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterTab === 'all' ? 'bg-[#008069] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Tümü ({chats.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('groups')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      filterTab === 'groups' ? 'bg-[#008069] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-3 h-3" /> Gruplar ({groupCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('contacts')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      filterTab === 'contacts' ? 'bg-[#008069] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-3 h-3" /> Birebir Kişiler ({contactCount})
                  </button>
                </div>
              </div>

              {/* Sohbet Listesi */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-500 space-y-1">
                    <p className="font-semibold">Eşleşen sohbet bulunamadı.</p>
                    <p className="text-[11px]">
                      WhatsApp'tan herhangi bir gruba veya kişiye mesaj attığınızda otomatik olarak burada listelenecektir.
                    </p>
                  </div>
                ) : (
                  filteredChats.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-gray-50 hover:bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-xl text-white ${
                            c.isGroup ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}
                        >
                          {c.isGroup ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{c.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>{c.isGroup ? 'Grup' : 'Birebir Kişi'}</span>
                            {c.number && <span>• +{c.number}</span>}
                            {c.boundGroup && (
                              <span className="text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                                🔗 {c.boundGroup.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => doBindToCurrentGroup(c.id, c.name)}
                          disabled={loading}
                          className="px-2.5 py-1.5 bg-[#008069] hover:bg-[#00705a] text-white text-[11px] font-semibold rounded-xl disabled:opacity-50 transition flex items-center gap-1"
                          title={`"${currentGroupName}" grubuna bağla`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">Bu Gruba Bağla</span>
                        </button>
                        <button
                          onClick={() => doCreateNewChannel(c.id, c.name, c.isGroup)}
                          disabled={loading}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-semibold rounded-xl disabled:opacity-50 transition flex items-center gap-1"
                          title="Bu sohbet için yeni bir PRJrms kanalı oluştur"
                        >
                          <PlusCircle className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">Yeni Kanal Aç</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Manuel ID / Numara Bağlama */}
              <div className="pt-2 border-t border-gray-100">
                {!showManual ? (
                  <button
                    onClick={() => setShowManual(true)}
                    className="text-xs font-semibold text-[#008069] hover:underline flex items-center gap-1"
                  >
                    + Manuel Telefon Numarası veya WhatsApp ID ile Eşle
                  </button>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-gray-800">Manuel WhatsApp Eşleme</p>
                    <input
                      type="text"
                      placeholder="Telefon No (örn: 905332760534) veya Grup ID (120363...)"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          const clean = manualId.trim();
                          const finalId = clean.includes('@') ? clean : (clean + '@c.us');
                          doBindToCurrentGroup(finalId, clean);
                        }}
                        disabled={!manualId.trim() || loading}
                        className="px-3.5 py-1.5 bg-[#008069] hover:bg-[#00705a] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                      >
                        Bu Gruba Bağla
                      </button>
                      <button
                        onClick={() => setShowManual(false)}
                        className="text-xs text-gray-500 hover:text-gray-800"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Komutları Bilgilendirmesi */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1.5 text-[11px] text-blue-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1 text-blue-950">
                  <span>🤖</span> WhatsApp'tan Planlama & Görev Komutları:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-850">
                  <li><code>!gorev &lt;başlık&gt; [tarih]</code> : Yeni görev açar (Birebirde karşıdaki kişiye, grupta etiketlenen kişiye atar)</li>
                  <li><code>!durum</code> : O sohbetteki aktif görevleri listeler</li>
                  <li><code>!tamamla &lt;görev adı&gt;</code> : Görevi tamamlandı yapar</li>
                </ul>
              </div>
            </div>
          )}

          {/* Oturum Kapalı Durumu */}
          {s === 'disconnected' && (
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#25D366] mx-auto shadow-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">WhatsApp Oturumu Kapalı</p>
                <p className="text-xs text-gray-500 mt-1">
                  Gruplarınızı ve birebir çalışan yazışmalarını çift yönlü bağlamak için oturum başlatın.
                </p>
              </div>
              <button
                onClick={doConnect}
                disabled={loading}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>{loading ? 'Başlatılıyor...' : 'WhatsApp Bağla (QR Kod Üret)'}</span>
              </button>
            </div>
          )}

          {/* Footer Butonları */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {s === 'ready' ? (
              <button
                onClick={doDisconnect}
                disabled={loading}
                className="px-3.5 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Bağlantıyı Kes</span>
              </button>
            ) : <span />}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
