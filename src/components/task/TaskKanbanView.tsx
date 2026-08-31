'use client';

import React, { useState, useMemo } from 'react';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
  UserSession,
  GroupMemberItem,
} from '@/lib/types';
import {
  Search,
  Filter,
  User as UserIcon,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Edit3,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface Props {
  tasks: TaskItem[];
  members: GroupMemberItem[];
  currentUser: UserSession;
  onEditTask: (task: TaskItem) => void;
  onCompleteTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onJumpToMessage: (messageId: string) => void;
  onCreateTaskClick?: () => void;
}

const COLUMNS: {
  status: TaskStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconColor: string;
}[] = [
  {
    status: 'PENDING',
    title: 'Yapılacak (Bekleyen)',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderColor: 'border-slate-300',
    iconColor: 'text-slate-500',
  },
  {
    status: 'IN_PROGRESS',
    title: 'Devam Eden (İşlemde)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-400',
    iconColor: 'text-amber-600',
  },
  {
    status: 'COMPLETED',
    title: 'Tamamlanan',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-400',
    iconColor: 'text-emerald-600',
  },
  {
    status: 'CANCELLED',
    title: 'İptal / Askıda',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-300',
    iconColor: 'text-rose-500',
  },
];

export default function TaskKanbanView({
  tasks,
  members,
  currentUser,
  onEditTask,
  onCompleteTask,
  onStatusChange,
  onJumpToMessage,
  onCreateTaskClick,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.assignedTo?.fullName && t.assignedTo.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Assignee filter
      const matchesAssignee =
        selectedAssignee === 'ALL' || t.assignedToId === selectedAssignee;

      // Priority filter
      const matchesPriority =
        selectedPriority === 'ALL' || t.priority === selectedPriority;

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchQuery, selectedAssignee, selectedPriority]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            🔥 Acil
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
            ⚡ Yüksek
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Orta
          </span>
        );
      case 'LOW':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Düşük
          </span>
        );
    }
  };

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'PENDING') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'COMPLETED';
    return null;
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'COMPLETED') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'PENDING';
    if (current === 'CANCELLED') return 'PENDING';
    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] overflow-hidden select-none">
      {/* Top Filter Bar */}
      <div className="p-2 sm:p-3.5 bg-white border-b border-[#e9edef] shadow-xs flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Görev veya kişi ara..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#f0f2f5] border border-transparent focus:border-[#008069] focus:bg-white rounded-xl text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Kişi Filtresi (Assignee) */}
          <div className="flex items-center gap-1 bg-[#f0f2f5] px-2 py-1 rounded-xl border border-[#e9edef]">
            <UserIcon className="w-3.5 h-3.5 text-[#54656f]" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent text-xs text-[#111b21] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tüm Kişiler (Herkes)</option>
              <option value={currentUser.id}>Benim Görevlerim ({currentUser.fullName.split(' ')[0]})</option>
              {members
                .filter((m) => m.userId !== currentUser.id)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.fullName}
                  </option>
                ))}
            </select>
          </div>

          {/* Öncelik Filtresi */}
          <div className="flex items-center gap-1 bg-[#f0f2f5] px-2 py-1 rounded-xl border border-[#e9edef]">
            <Filter className="w-3.5 h-3.5 text-[#54656f]" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs text-[#111b21] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tüm Öncelikler</option>
              <option value="URGENT">🔥 Acil</option>
              <option value="HIGH">⚡ Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex-1 p-2 sm:p-4 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full min-w-[760px] pb-2">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="flex-1 flex flex-col min-w-[220px] max-w-[340px] bg-[#f0f2f5]/90 backdrop-blur-xs rounded-2xl border border-[#e9edef] shadow-sm overflow-hidden"
              >
                {/* Column Header */}
                <div className={`px-3 py-2.5 bg-white border-b ${col.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#111b21]">{col.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Card List */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-[#8696a0] border border-dashed border-gray-300 rounded-xl bg-white/40">
                      <p className="text-[11px]">Bu aşamada görev yok</p>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED';
                      const nextStatus = getNextStatus(task.status);
                      const prevStatus = getPrevStatus(task.status);

                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-xl p-3 border shadow-xs hover:shadow-md transition duration-150 space-y-2.5 ${
                            task.status === 'COMPLETED'
                              ? 'border-emerald-200 bg-emerald-50/20'
                              : overdue
                              ? 'border-red-300 bg-red-50/20'
                              : 'border-[#e9edef]'
                          }`}
                        >
                          {/* Top: Priority & Actions */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {getPriorityBadge(task.priority)}
                              {overdue && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> Gecikti
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Jump to chat message */}
                              <button
                                onClick={() => onJumpToMessage(task.messageId)}
                                title="Sohbetteki Orijinal Mesaja Git"
                                className="p-1 rounded-lg text-[#54656f] hover:text-[#008069] hover:bg-[#f0f2f5] transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Task Modal */}
                              <button
                                onClick={() => onEditTask(task)}
                                title="Görevi Düzenle"
                                className="p-1 rounded-lg text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4
                              className={`text-xs font-semibold leading-snug ${
                                task.status === 'COMPLETED'
                                  ? 'line-through text-[#54656f]'
                                  : 'text-[#111b21]'
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-[#54656f] line-clamp-2 mt-1 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Assignee & Due Date */}
                          <div className="pt-2 border-t border-[#f0f2f5] flex items-center justify-between text-[10px] text-[#54656f]">
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[55%]">
                              <img
                                src={
                                  task.assignedTo?.avatarUrl ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToId}`
                                }
                                alt={task.assignedTo?.fullName || 'Üye'}
                                className="w-4 h-4 rounded-full bg-[#f0f2f5] flex-shrink-0"
                              />
                              <span className="truncate font-medium text-[#111b21]">
                                {task.assignedTo?.fullName?.split(' ')[0] || 'Atanmamış'}
                              </span>
                            </div>

                            {/* Due Date */}
                            {task.dueDate && (
                              <div
                                className={`flex items-center gap-1 font-medium ${
                                  overdue ? 'text-red-600 font-bold' : 'text-[#54656f]'
                                }`}
                              >
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {new Date(task.dueDate).toLocaleDateString('tr-TR', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Workflow Transition Buttons */}
                          <div className="pt-1.5 flex items-center justify-between gap-1">
                            {prevStatus ? (
                              <button
                                onClick={() => onStatusChange(task.id, prevStatus)}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium text-[#54656f] hover:bg-[#f0f2f5] flex items-center gap-0.5 transition"
                                title="Önceki Aşamaya Al"
                              >
                                <ChevronLeft className="w-3 h-3" />
                                <span>Geri</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            {task.status !== 'COMPLETED' ? (
                              nextStatus === 'COMPLETED' ? (
                                <button
                                  onClick={() => onCompleteTask(task)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tamamla</span>
                                </button>
                              ) : nextStatus ? (
                                <button
                                  onClick={() => onStatusChange(task.id, nextStatus)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#008069] hover:bg-[#00705a] text-white flex items-center gap-1 shadow-xs transition"
                                >
                                  <span>İşleme Al</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : null
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Bitti
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
