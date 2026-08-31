'use client';

import React, { useState } from 'react';
import { Search, Plus, UserPlus, Settings, LogOut, MessageSquare, Shield, Users } from 'lucide-react';
import { GroupItem, UserSession } from '@/lib/types';
import AdminCreateUserModal from './AdminCreateUserModal';
import UserProfileModal from './UserProfileModal';

interface Props {
  groups: GroupItem[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  currentUser: UserSession;
  onLogout: () => void;
  onUserCreated: () => void;
  onProfileUpdated: (user: UserSession) => void;
}

export default function Sidebar({
  groups,
  activeGroupId,
  onSelectGroup,
  currentUser,
  onLogout,
  onUserCreated,
  onProfileUpdated,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-80 md:w-96 h-full flex flex-col bg-[#111b21] border-r border-[#222e35] select-none">
      {/* Top Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-[#202c33] border-b border-[#222e35]">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => setShowProfileModal(true)}>
            <img
              src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt={currentUser.fullName}
              className="w-10 h-10 rounded-full border border-[#00a884] bg-[#111b21] object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00a884] border-2 border-[#202c33]" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-semibold text-[#e9edef] truncate">{currentUser.fullName}</h3>
            <div className="flex items-center gap-1">
              {currentUser.role === 'ADMIN' ? (
                <span className="text-[10px] font-semibold text-purple-400 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Yönetici
                </span>
              ) : (
                <span className="text-[10px] text-[#8696a0]">Ekip Üyesi</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowAdminModal(true)}
              title="Yeni Ekip Üyesi Ekle"
              className="p-2 rounded-xl text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] transition"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Profili Düzenle"
            className="p-2 rounded-xl text-[#8696a0] hover:text-white hover:bg-[#111b21] transition"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            title="Çıkış Yap"
            className="p-2 rounded-xl text-[#8696a0] hover:text-red-400 hover:bg-[#111b21] transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-[#111b21] border-b border-[#222e35]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sohbet veya grup ara..."
            className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0]/60 focus:outline-none focus:border-[#00a884]"
          />
        </div>
      </div>

      {/* Groups / Channels List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/40">
        <div className="px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-[#8696a0] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#00a884]" /> Sohbet Grupları ({filteredGroups.length})
          </span>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8696a0]">
            Sohbet grubu bulunamadı.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isActive = group.id === activeGroupId;
            const lastMsg = group.lastMessage;

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`flex items-center gap-3.5 px-4 py-3 cursor-pointer transition ${
                  isActive
                    ? 'bg-[#2a3942] border-l-4 border-[#00a884]'
                    : 'hover:bg-[#202c33]/70'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={group.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + group.id}
                    alt={group.name}
                    className="w-12 h-12 rounded-full border border-[#2a3942] bg-[#202c33] object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a884] border-2 border-[#111b21] flex items-center justify-center text-[8px] text-white">
                    {group.members.length}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-[#e9edef] truncate">{group.name}</h4>
                    {lastMsg && (
                      <span className="text-[10px] text-[#8696a0]">
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8696a0] truncate mt-0.5">
                    {lastMsg ? (
                      <>
                        <span className="text-[#00a884] font-medium">{lastMsg.sender.fullName}: </span>
                        {lastMsg.content || (lastMsg.attachments?.length ? '📎 Medya / Ek' : '')}
                      </>
                    ) : (
                      group.description || 'Henüz mesaj yok'
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AdminCreateUserModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onUserCreated={onUserCreated}
      />
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onProfileUpdated={onProfileUpdated}
      />
    </aside>
  );
}
