'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Clock, User, Calendar, AlertCircle, ArrowUpRight, Edit3 } from 'lucide-react';
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
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">Acil</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">Yüksek</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">Düşük</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Normal</span>;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
      />

      <aside className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-80 lg:w-96 h-full flex flex-col bg-white border-l border-[#e9edef] select-none z-40 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between bg-[#f0f2f5] border-b border-[#e9edef]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#008069]/10 text-[#008069]">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-[#111b21] flex items-center gap-1.5">
                Grup Görevleri
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-white text-[#008069] font-bold border border-[#e9edef]">
                  {tasks.length}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#54656f]">Chat-to-Task Listesi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#54656f] hover:text-[#111b21] hover:bg-white transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Summary KPI Cards */}
        <div className="p-2 sm:p-3 grid grid-cols-3 gap-1.5 sm:gap-2 bg-white border-b border-[#e9edef]">
          <button
            onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'PENDING'
                ? 'bg-amber-50 border-amber-400'
                : 'bg-[#f0f2f5] border-[#e9edef] hover:border-amber-300'
            }`}
          >
            <p className="text-sm sm:text-base font-bold text-amber-700">{pendingCount}</p>
            <p className="text-[9px] sm:text-[10px] text-[#54656f] mt-0.5 font-medium">Bekleyen</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'IN_PROGRESS'
                ? 'bg-blue-50 border-blue-400'
                : 'bg-[#f0f2f5] border-[#e9edef] hover:border-blue-300'
            }`}
          >
            <p className="text-sm sm:text-base font-bold text-blue-700">{inProgressCount}</p>
            <p className="text-[9px] sm:text-[10px] text-[#54656f] mt-0.5 font-medium">Devam Eden</p>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`p-2 rounded-xl border text-center transition ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-50 border-[#008069]'
                : 'bg-[#f0f2f5] border-[#e9edef] hover:border-emerald-300'
            }`}
          >
            <p className="text-sm sm:text-base font-bold text-[#008069]">{completedCount}</p>
            <p className="text-[9px] sm:text-[10px] text-[#54656f] mt-0.5 font-medium">Tamamlandı</p>
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="p-2 sm:p-3 bg-white space-y-2 border-b border-[#e9edef]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Görev veya kişi ara..."
            className="w-full bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl px-3 py-1.5 text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none transition"
          />

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] sm:text-[11px]">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-[#008069] text-white font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:text-[#111b21]'
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
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#54656f]">
              Kriterlere uygun görev bulunamadı.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#f0f2f5]/80 hover:bg-[#f0f2f5] border border-[#e9edef] hover:border-[#008069]/40 rounded-2xl p-3 transition shadow-xs"
              >
                {/* Top Row: Title, Edit Button & Scroll to Message */}
                <div className="flex items-start justify-between gap-1.5">
                  <h4 className="text-xs font-semibold text-[#111b21] leading-snug">{task.title}</h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEditTask(task)}
                      title="Görevi Düzenle"
                      className="p-1 rounded-lg bg-white text-[#54656f] hover:text-[#008069] border border-[#e9edef] transition shadow-xs"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        onScrollToMessage(task.messageId);
                        if (window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                      title="Sohbette Mesaja Git"
                      className="p-1 rounded-lg bg-white text-[#54656f] hover:text-[#008069] border border-[#e9edef] transition shadow-xs"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-[11px] text-[#54656f] mt-1 line-clamp-2">{task.description}</p>
                )}

                {/* Middle Row: Priority & Due Date */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e9edef] text-[10px] sm:text-[11px]">
                  <div className="flex items-center gap-1">
                    {getPriorityBadge(task.priority)}
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-[10px] text-[#54656f]">
                      <Calendar className="w-3 h-3 text-[#008069]" />
                      <span>{new Date(task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Assignee & Quick Status Dropdown */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e9edef]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={task.assignedTo?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + task.assignedToId}
                      alt={task.assignedTo?.fullName || 'Assignee'}
                      className="w-5 h-5 rounded-full bg-white flex-shrink-0"
                    />
                    <span className="text-[11px] font-medium text-[#111b21] truncate max-w-[80px] sm:max-w-[100px]">
                      {task.assignedTo?.fullName || 'Atanmamış'}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                    className={`text-[9px] sm:text-[10px] font-semibold rounded-lg px-1.5 py-0.5 border focus:outline-none transition shadow-xs ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : task.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
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
