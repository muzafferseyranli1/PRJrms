'use client';

import React from 'react';
import { Users, CheckSquare, MoreVertical, Search } from 'lucide-react';
import { GroupItem } from '@/lib/types';

interface Props {
  group: GroupItem;
  taskCount: number;
  isTaskPanelOpen: boolean;
  onToggleTaskPanel: () => void;
  typingUsers: string[];
}

export default function ChatHeader({
  group,
  taskCount,
  isTaskPanelOpen,
  onToggleTaskPanel,
  typingUsers,
}: Props) {
  return (
    <header className="h-16 px-4 flex items-center justify-between bg-[#202c33] border-b border-[#222e35] select-none z-10">
      {/* Group Info */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={group.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + group.id}
          alt={group.name}
          className="w-10 h-10 rounded-full border border-[#2a3942] bg-[#111b21] object-cover"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#e9edef] truncate">{group.name}</h2>
          <div className="text-xs text-[#8696a0] truncate">
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
      <div className="flex items-center gap-1.5">
        {/* Toggle Task Side Panel Button */}
        <button
          onClick={onToggleTaskPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
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
