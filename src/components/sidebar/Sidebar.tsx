'use client';

import React, { useState } from 'react';
import { Search, Plus, UserPlus, Settings, LogOut, Shield, Users } from 'lucide-react';
import { GroupItem, UserSession } from '@/lib/types';
import AdminCreateUserModal from './AdminCreateUserModal';
import UserProfileModal from './UserProfileModal';
import CreateGroupModal from './CreateGroupModal';

interface Props {
  groups: GroupItem[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  currentUser: UserSession;
  onLogout: () => void;
  onUserCreated: () => void;
  onProfileUpdated: (user: UserSession) => void;
  className?: string;
}

export default function Sidebar({
  groups,
  activeGroupId,
  onSelectGroup,
  currentUser,
  onLogout,
  onUserCreated,
  onProfileUpdated,
  className = '',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`w-full md:w-80 lg:w-96 h-full flex flex-col bg-white border-r border-[#e9edef] select-none ${className}`}>
      {/* Top Header */}
      <div className="h-16 px-3 sm:px-4 flex items-center justify-between bg-[#f0f2f5] border-b border-[#e9edef]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative cursor-pointer flex-shrink-0" onClick={() => setShowProfileModal(true)}>
            <img
              src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt={currentUser.fullName}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#008069] bg-white object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#008069] border-2 border-white" />
          </div>
          <div className="overflow-hidden min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-[#111b21] truncate">{currentUser.fullName}</h3>
            <div className="flex items-center gap-1">
              {currentUser.role === 'ADMIN' ? (
                <span className="text-[9px] sm:text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Yönetici
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] text-[#54656f]">Ekip Üyesi</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Yeni Grup Butonu */}
          <button
            onClick={() => setShowCreateGroupModal(true)}
            title="Yeni Sohbet Grubu Oluştur"
            className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-[#008069] hover:bg-white transition"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowAdminModal(true)}
              title="Yeni Ekip Üyesi Ekle"
              className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-[#008069] hover:bg-white transition"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Profili Düzenle"
            className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-[#111b21] hover:bg-white transition"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={onLogout}
            title="Çıkış Yap"
            className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-red-600 hover:bg-white transition"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 sm:p-3 bg-white border-b border-[#e9edef]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sohbet veya grup ara..."
            className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none transition"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e9edef]">
        <div className="px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-[#54656f] flex items-center justify-between bg-[#f0f2f5]/40">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#008069]" /> Gruplar ({filteredGroups.length})
          </span>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="text-[10px] text-[#008069] hover:underline font-semibold flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Yeni Grup
          </button>
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
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition ${
                  isActive
                    ? 'bg-[#f0f2f5] border-l-4 border-[#008069]'
                    : 'hover:bg-[#f5f6f6] active:bg-[#e9edef]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={group.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + group.id}
                    alt={group.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#e9edef] bg-[#f0f2f5] object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#008069] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                    {group.members.length}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#111b21] truncate">{group.name}</h4>
                    {lastMsg && (
                      <span className="text-[10px] text-[#8696a0]">
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#54656f] truncate mt-0.5">
                    {lastMsg ? (
                      <>
                        <span className="text-[#008069] font-medium">{lastMsg.sender.fullName}: </span>
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
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={(newGroupId) => {
          onUserCreated();
          onSelectGroup(newGroupId);
        }}
        currentUser={currentUser}
      />
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
