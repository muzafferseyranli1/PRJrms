'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  LayoutGrid,
  FileSpreadsheet,
  CheckSquare,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { GroupItem, UserSession } from '@/lib/types';

export type MainViewType = 'chat' | 'kanban' | 'table';

interface Props {
  group: GroupItem;
  taskCount: number;
  isTaskPanelOpen: boolean;
  onToggleTaskPanel: () => void;
  typingUsers: string[];
  currentUser: UserSession;
  currentView: MainViewType;
  onChangeView: (view: MainViewType) => void;
  onBackToSidebar?: () => void;
  onDeleteGroup: (groupId: string) => void;
}

export default function ChatHeader({
  group,
  taskCount,
  isTaskPanelOpen,
  onToggleTaskPanel,
  typingUsers,
  currentUser,
  currentView,
  onChangeView,
  onBackToSidebar,
  onDeleteGroup,
}: Props) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <>
      <header className="h-14 sm:h-16 px-2 sm:px-4 flex items-center justify-between bg-[#f0f2f5] border-b border-[#e9edef] select-none z-10 gap-2">
        {/* Left: Group Info & Mobile Back Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] transition flex-shrink-0"
              title="Sohbet Listesine Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <img
            src={group.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + group.id}
            alt={group.name}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#e9edef] bg-white object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-[#111b21] truncate">{group.name}</h2>
            <div className="text-[10px] sm:text-xs text-[#54656f] truncate">
              {typingUsers.length > 0 ? (
                <span className="text-[#008069] font-medium animate-pulse">
                  {typingUsers.join(', ')} yazıyor...
                </span>
              ) : (
                <span>
                  {group.members.length} üye ({group.members.map((m) => m.user.fullName.split(' ')[0]).join(', ')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: View Switcher (Sohbet | Kanban | Plan Tablosu) */}
        <div className="flex items-center bg-[#e9edef]/80 p-1 rounded-2xl border border-[#e9edef] flex-shrink-0">
          {/* 1. Sohbet */}
          <button
            onClick={() => onChangeView('chat')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              currentView === 'chat'
                ? 'bg-white text-[#111b21] shadow-xs'
                : 'text-[#54656f] hover:text-[#111b21]'
            }`}
            title="Sohbet ve Akış"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Sohbet</span>
          </button>

          {/* 2. Kanban Panosu */}
          <button
            onClick={() => onChangeView('kanban')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              currentView === 'kanban'
                ? 'bg-[#008069] text-white shadow-xs'
                : 'text-[#54656f] hover:text-[#111b21]'
            }`}
            title="Kanban Panosu"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Kanban</span>
            {taskCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  currentView === 'kanban' ? 'bg-white text-[#008069]' : 'bg-white/80 text-[#54656f]'
                }`}
              >
                {taskCount}
              </span>
            )}
          </button>

          {/* 3. Plan / Excel Tablosu */}
          <button
            onClick={() => onChangeView('table')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
              currentView === 'table'
                ? 'bg-[#008069] text-white shadow-xs'
                : 'text-[#54656f] hover:text-[#111b21]'
            }`}
            title="Plan & Excel Tablosu"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Plan Tablosu</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Quick Drawer Button in Chat Mode */}
          {currentView === 'chat' && (
            <button
              onClick={onToggleTaskPanel}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                isTaskPanelOpen
                  ? 'bg-[#008069] text-white shadow-md shadow-[#008069]/20'
                  : 'bg-white text-[#111b21] border border-[#e9edef] hover:border-[#008069]/50 shadow-xs'
              }`}
              title="Görev Çekmecesi"
            >
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Panel</span>
            </button>
          )}

          {/* Admin Group Delete Button */}
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              title="Grubu Sil (Yönetici)"
              className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-red-600 hover:bg-white transition"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Delete Group Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-red-200 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#111b21]">Grubu Silmek İstiyor Musunuz?</h3>
              <p className="text-xs text-[#54656f] mt-1.5">
                <span className="text-[#111b21] font-semibold">"{group.name}"</span> grubu ve içindeki tüm mesajlar, ekler ve görevler kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#54656f] hover:bg-[#f0f2f5] transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(false);
                  onDeleteGroup(group.id);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-md shadow-red-600/20"
              >
                Evet, Grubu Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
