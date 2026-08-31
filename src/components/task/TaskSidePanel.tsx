'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Clock, User, Calendar, AlertCircle, ArrowUpRight, CheckCircle2, PlayCircle, XCircle, Edit3 } from 'lucide-react';
import { TaskItem, TaskStatus } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onScrollToMessage: (messageId: string) => void;
  onRequestCompleteTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
}

export default function TaskSidePanel({
  isOpen,
  onClose,
  tasks,
  onScrollToMessage,
  onRequestCompleteTask,
  onEditTask,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleStatusChange = (task: TaskItem, newStatus: TaskStatus) => {
    if (newStatus === 'COMPLETED') {
      onRequestCompleteTask(task);
      return;
    }
    const socket = getSocket();
    socket.emit('update_task_status', { taskId: task.id, status: newStatus });
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesFilter = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedTo?.fullName && t.assignedTo.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Acil</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">Yüksek</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">Düşük</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Normal</span>;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
      />

      <aside className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-80 lg:w-96 h-full flex flex-col bg-[#111b21] border-l border-[#222e35] select-none z-40 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="h-16 px-4 flex items-center justify-between bg-[#202c33] border-b border-[#222e35]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00a884]/20 text-[#00a884]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Grup Görevleri
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#111b21] text-[#00a884] font-bold border border-[#2a3942]">
                  {tasks.length}
                </span>
              </h3>
              <p className="text-[11px] text-[#8696a0]">Chat-to-Task Görev Listesi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#111b21] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Cards */}
        <div className="p-3 grid grid-cols-3 gap-2 bg-[#111b21] border-b border-[#222e35]">
          <button
            onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500/20 border-amber-500/50'
                : 'bg-[#202c33] border-[#2a3942] hover:border-amber-500/30'
            }`}
          >
            <p className="text-base font-bold text-amber-400">{pendingCount}</p>
            <p className="text-[10px] text-[#8696a0] mt-0.5 font-medium">Bekleyen</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'IN_PROGRESS'
                ? 'bg-blue-500/20 border-blue-500/50'
                : 'bg-[#202c33] border-[#2a3942] hover:border-blue-500/30'
            }`}
          >
            <p className="text-base font-bold text-blue-400">{inProgressCount}</p>
            <p className="text-[10px] text-[#8696a0] mt-0.5 font-medium">Devam Eden</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'COMPLETED'
                ? 'bg-[#00a884]/20 border-[#00a884]/50'
                : 'bg-[#202c33] border-[#2a3942] hover:border-[#00a884]/30'
            }`}
          >
            <p className="text-base font-bold text-[#00a884]">{completedCount}</p>
            <p className="text-[10px] text-[#8696a0] mt-0.5 font-medium">Tamamlandı</p>
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="p-3 bg-[#111b21] space-y-2 border-b border-[#222e35]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Görev veya kişi ara..."
            className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-[#e9edef] placeholder-[#8696a0]/60 focus:outline-none focus:border-[#00a884]"
          />

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-[#00a884] text-[#111b21] font-semibold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-white'
                }`}
              >
                {st === 'ALL' && 'Tümü'}
                {st === 'PENDING' && 'Bekleyen'}
                {st === 'IN_PROGRESS' && 'Devam Eden'}
                {st === 'COMPLETED' && 'Tamamlanan'}
                {st === 'CANCELLED' && 'İptal'}
              </button>
            ))}
          </div>
        </div>

        {/* Task Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8696a0]">
              Kriterlere uygun görev bulunamadı.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#202c33]/70 hover:bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/40 rounded-xl p-3.5 transition group"
              >
                {/* Top Row: Title, Edit Button & Scroll to Message */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#e9edef] leading-snug">{task.title}</h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEditTask(task)}
                      title="Görevi Düzenle"
                      className="p-1 rounded bg-[#111b21] text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onScrollToMessage(task.messageId);
                        if (window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                      title="Sohbette Mesaja Git"
                      className="p-1 rounded bg-[#111b21] text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-[11px] text-[#8696a0] mt-1 line-clamp-2">{task.description}</p>
                )}

                {/* Middle Row: Priority & Due Date */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#2a3942]/60 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(task.priority)}
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-[10px] text-[#8696a0]">
                      <Calendar className="w-3 h-3 text-[#00a884]" />
                      <span>{new Date(task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Assignee & Quick Status Dropdown */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#2a3942]/60">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={task.assignedTo?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + task.assignedToId}
                      alt={task.assignedTo?.fullName || 'Assignee'}
                      className="w-5 h-5 rounded-full bg-[#111b21]"
                    />
                    <span className="text-[11px] font-medium text-[#e9edef] truncate max-w-[90px]">
                      {task.assignedTo?.fullName || 'Atanmamış'}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                    className={`text-[10px] font-semibold rounded-lg px-2 py-1 border focus:outline-none transition ${
                      task.status === 'COMPLETED'
                        ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : task.status === 'CANCELLED'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    <option value="PENDING">Bekliyor</option>
                    <option value="IN_PROGRESS">Devam Ediyor</option>
                    <option value="COMPLETED">Tamamlandı</option>
                    <option value="CANCELLED">İptal</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
