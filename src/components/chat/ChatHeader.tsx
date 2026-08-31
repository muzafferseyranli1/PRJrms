'use client';

import React from 'react';
import { Users, CheckSquare, ArrowLeft, MoreVertical } from 'lucide-react';
import { GroupItem } from '@/lib/types';

interface Props {
  group: GroupItem;
  taskCount: number;
  isTaskPanelOpen: boolean;
  onToggleTaskPanel: () => void;
  typingUsers: string[];
  onBackToSidebar?: () => void;
}

export default function ChatHeader({
  group,
  taskCount,
  isTaskPanelOpen,
  onToggleTaskPanel,
  typingUsers,
  onBackToSidebar,
}: Props) {
  return (
    <header className="h-16 px-3 sm:px-4 flex items-center justify-between bg-[#202c33] border-b border-[#222e35] select-none z-10">
      {/* Group Info & Mobile Back Button */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onBackToSidebar && (
          <button
            onClick={onBackToSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl text-[#8696a0] hover:text-white hover:bg-[#111b21] transition"
            title="Sohbet Listesine Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={group.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + group.id}
          alt={group.name}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#2a3942] bg-[#111b21] object-cover flex-shrink-0"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#e9edef] truncate">{group.name}</h2>
          <div className="text-[11px] sm:text-xs text-[#8696a0] truncate">
            {typingUsers.length > 0 ? (
              <span className="text-[#00a884] font-medium animate-pulse">
                {typingUsers.join(', ')} yazıyor...
              </span>
            ) : (
              <span>{group.members.length} üye ({group.members.map((m) => m.user.fullName.split(' ')[0]).join(', ')})</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Toggle Task Side Panel Button */}
        <button
          onClick={onToggleTaskPanel}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            isTaskPanelOpen
              ? 'bg-[#00a884] text-[#111b21] shadow-lg shadow-[#00a884]/20'
              : 'bg-[#111b21] text-[#e9edef] border border-[#2a3942] hover:border-[#00a884]/50'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Görevler</span>
          {taskCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isTaskPanelOpen ? 'bg-[#111b21] text-[#00a884]' : 'bg-[#00a884] text-[#111b21]'
              }`}
            >
              {taskCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
