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
  Download,
  FileSpreadsheet,
  CheckSquare,
  ArrowUpDown,
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
}

export default function TaskGridView({
  tasks,
  members,
  currentUser,
  onEditTask,
  onCompleteTask,
  onStatusChange,
  onJumpToMessage,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // KPI Calculations
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === 'PENDING').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'COMPLETED') return false;
      return new Date(t.dueDate).getTime() < Date.now();
    }).length;

    return { total, pending, inProgress, completed, overdue };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.assignedTo?.fullName && t.assignedTo.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAssignee =
        selectedAssignee === 'ALL' || t.assignedToId === selectedAssignee;

      const matchesStatus =
        selectedStatus === 'ALL' || t.status === selectedStatus;

      const matchesPriority =
        selectedPriority === 'ALL' || t.priority === selectedPriority;

      return matchesSearch && matchesAssignee && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, selectedAssignee, selectedStatus, selectedPriority]);

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1">
            🔥 Acil
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 inline-flex items-center gap-1">
            ⚡ Yüksek
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Orta
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Düşük
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Bekliyor
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Devam Ediyor
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tamamlandı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-300">
            İptal
          </span>
        );
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Gorev Basligi',
      'Aciklama',
      'Sorumlusu',
      'Oncelik',
      'Durum',
      'Bitis Tarihi',
      'Olusturan',
      'Olusturulma Tarihi',
    ];

    const rows = filteredTasks.map((t, idx) => [
      idx + 1,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.assignedTo?.fullName || 'Atanmamış'}"`,
      t.priority,
      t.status,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR') : '',
      `"${t.createdBy?.fullName || ''}"`,
      new Date(t.createdAt).toLocaleDateString('tr-TR'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRJrms_Gorev_Plani_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] overflow-hidden select-none">
      {/* Top KPI Header (Plan Old Style Summary) */}
      <div className="p-2.5 sm:p-3 bg-white border-b border-[#e9edef] shadow-xs">
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
          {/* Toplam */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] border border-[#e9edef] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#54656f] font-medium">Toplam Plan</p>
              <p className="text-sm sm:text-base font-bold text-[#111b21]">{stats.total}</p>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-[#54656f]" />
          </div>

          {/* Bekleyen */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-600 font-medium">Yapılacak</p>
              <p className="text-sm sm:text-base font-bold text-slate-800">{stats.pending}</p>
            </div>
            <Clock className="w-5 h-5 text-slate-500" />
          </div>

          {/* Devam Eden */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-amber-700 font-medium">Devam Eden</p>
              <p className="text-sm sm:text-base font-bold text-amber-800">{stats.inProgress}</p>
            </div>
            <span className="text-amber-500 font-bold text-base">⚡</span>
          </div>

          {/* Tamamlanan */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-700 font-medium">Tamamlandı</p>
              <p className="text-sm sm:text-base font-bold text-emerald-800">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-[#008069]" />
          </div>

          {/* Geciken */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between col-span-2 xs:col-span-1">
            <div>
              <p className="text-[10px] text-red-600 font-medium">Geciken</p>
              <p className="text-sm sm:text-base font-bold text-red-700">{stats.overdue}</p>
            </div>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="p-2 sm:p-3 bg-[#f0f2f5] border-b border-[#e9edef] flex flex-wrap items-center justify-between gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tabloda ara..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#e9edef] focus:border-[#008069] rounded-xl text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Kişi Filtresi */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-[#e9edef]">
            <UserIcon className="w-3.5 h-3.5 text-[#54656f]" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent text-xs text-[#111b21] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tüm Sorumlular</option>
              <option value={currentUser.id}>Benim Görevlerim</option>
              {members
                .filter((m) => m.userId !== currentUser.id)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.fullName}
                  </option>
                ))}
            </select>
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-[#e9edef]">
            <Filter className="w-3.5 h-3.5 text-[#54656f]" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-[#111b21] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="PENDING">Yapılacak</option>
              <option value="IN_PROGRESS">Devam Eden</option>
              <option value="COMPLETED">Tamamlanan</option>
              <option value="CANCELLED">İptal</option>
            </select>
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#e9edef] border border-[#e9edef] text-xs font-semibold text-[#111b21] transition shadow-2xs"
            title="Excel / CSV Olarak İndir"
          >
            <Download className="w-3.5 h-3.5 text-[#008069]" />
            <span className="hidden sm:inline">Excel İndir</span>
          </button>
        </div>
      </div>

      {/* Excel Style Data Grid Table */}
      <div className="flex-1 p-2 sm:p-4 overflow-auto">
        <div className="bg-white rounded-2xl border border-[#e9edef] shadow-sm overflow-hidden min-w-[850px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f2f5] border-b border-[#e9edef] text-[11px] font-bold text-[#54656f] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[200px]">Yapılması Gerekenler / Konu</th>
                <th className="py-2.5 px-3 min-w-[180px]">Detay / Not</th>
                <th className="py-2.5 px-3 min-w-[140px]">Sorumlusu</th>
                <th className="py-2.5 px-3 w-28 text-center">Öncelik</th>
                <th className="py-2.5 px-3 w-32 text-center">Durum</th>
                <th className="py-2.5 px-3 w-28 text-center">Bitiş Tarihi</th>
                <th className="py-2.5 px-3 w-24 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9edef] text-xs text-[#111b21]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8696a0]">
                    Kayıtlı görev bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, idx) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED';

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-[#f8f9fa] transition ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-50/15'
                          : overdue
                          ? 'bg-red-50/20'
                          : idx % 2 === 1
                          ? 'bg-[#fafafa]'
                          : 'bg-white'
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-3 px-3 text-center font-bold text-[#8696a0] text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold leading-snug block ${
                            task.status === 'COMPLETED' ? 'line-through text-[#8696a0]' : 'text-[#111b21]'
                          }`}
                        >
                          {task.title}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3">
                        <p className="text-[11px] text-[#54656f] line-clamp-2 leading-relaxed">
                          {task.description || '-'}
                        </p>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={
                              task.assignedTo?.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToId}`
                            }
                            alt={task.assignedTo?.fullName || 'Üye'}
                            className="w-5 h-5 rounded-full bg-[#f0f2f5] flex-shrink-0"
                          />
                          <span className="font-medium truncate">
                            {task.assignedTo?.fullName || 'Atanmamış'}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 text-center">{getPriorityBadge(task.priority)}</td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center justify-center">
                          {getStatusBadge(task.status)}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 text-center">
                        {task.dueDate ? (
                          <span
                            className={`font-medium ${
                              overdue ? 'text-red-600 font-bold' : 'text-[#54656f]'
                            }`}
                          >
                            {new Date(task.dueDate).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-[#8696a0]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Complete Action Button */}
                          {task.status !== 'COMPLETED' && (
                            <button
                              onClick={() => onCompleteTask(task)}
                              title="Görevi Tamamla (Not Ekle)"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Jump to Chat Message */}
                          <button
                            onClick={() => onJumpToMessage(task.messageId)}
                            title="Sohbetteki Mesaja Git"
                            className="p-1.5 rounded-lg text-[#54656f] hover:text-[#008069] hover:bg-[#f0f2f5] transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Edit Task */}
                          <button
                            onClick={() => onEditTask(task)}
                            title="Görevi Düzenle / Tarih Değiştir"
                            className="p-1.5 rounded-lg text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
