'use client';

import React, { useRef } from 'react';
import { MoreVertical, CheckCheck, Download, FileText, CheckSquare, Calendar, User, CornerDownRight, Edit3 } from 'lucide-react';
import { MessageItem as MessageItemType, UserSession, TaskStatus, TaskItem } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  message: MessageItemType;
  currentUser: UserSession;
  onOpenContextMenu: (e: React.MouseEvent | { clientX: number; clientY: number }, msg: MessageItemType) => void;
  onImageClick: (url: string, name?: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onReactionClick: (messageId: string, emoji: string) => void;
  onRequestCompleteTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
}

export default function MessageItem({
  message,
  currentUser,
  onOpenContextMenu,
  onImageClick,
  onScrollToMessage,
  onReactionClick,
  onRequestCompleteTask,
  onEditTask,
}: Props) {
  const isMine = message.senderId === currentUser.id;
  const isSystem = message.type === 'SYSTEM';
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // System Message
  if (isSystem) {
    return (
      <div id={`msg-${message.id}`} className="flex justify-center my-1.5 transition duration-300">
        <div className="px-3 py-1 rounded-full bg-white/90 border border-[#e9edef] text-[10px] sm:text-[11px] text-[#54656f] flex items-center gap-1.5 shadow-xs text-center max-w-[92%] sm:max-w-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#008069] flex-shrink-0" />
          <span className="truncate">{message.content}</span>
        </div>
      </div>
    );
  }

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'COMPLETED' && message.task) {
      onRequestCompleteTask(message.task);
      return;
    }
    const socket = getSocket();
    socket.emit('update_task_status', { taskId, status: newStatus });
  };

  // Mobile Long-Press Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const coords = { clientX: touch.clientX, clientY: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
      onOpenContextMenu(coords, message);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Group reactions by emoji
  const reactionGroups: { [emoji: string]: { count: number; users: string[]; hasReacted: boolean } } = {};
  if (message.reactions) {
    message.reactions.forEach((r) => {
      if (!reactionGroups[r.emoji]) {
        reactionGroups[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      reactionGroups[r.emoji].count += 1;
      if (r.user?.fullName) {
        reactionGroups[r.emoji].users.push(r.user.fullName);
      }
      if (r.userId === currentUser.id) {
        reactionGroups[r.emoji].hasReacted = true;
      }
    });
  }

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id={`msg-${message.id}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenContextMenu(e, message);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`group flex items-end gap-1.5 sm:gap-2 my-1 px-1 sm:px-2 transition duration-300 select-none touch-manipulation ${
        isMine ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Incoming Avatar */}
      {!isMine && (
        <img
          src={message.sender.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + message.senderId}
          alt={message.sender.fullName}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#e9edef] object-cover flex-shrink-0 mb-0.5 border border-[#e9edef]"
        />
      )}

      {/* Message Bubble Container */}
      <div className="relative max-w-[90%] sm:max-w-[75%] md:max-w-[65%]">
        {/* Bubble */}
        <div
          className={`rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xs relative border ${
            isMine
              ? 'bg-[#d9fdd3] text-[#111b21] border-[#c0ebb8] rounded-br-xs'
              : 'bg-white text-[#111b21] border-[#e9edef] rounded-bl-xs'
          }`}
        >
          {/* Sender Name in Group */}
          {!isMine && (
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#008069] mb-0.5 flex items-center gap-1.5">
              <span>{message.sender.fullName}</span>
              {message.sender.role === 'ADMIN' && (
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-normal">
                  Yönetici
                </span>
              )}
            </p>
          )}

          {/* Reply Quote Banner */}
          {message.replyTo && (
            <div
              onClick={() => onScrollToMessage(message.replyTo!.id)}
              className={`mb-1.5 p-1.5 sm:p-2 rounded-xl text-xs cursor-pointer border-l-3 transition flex items-start gap-1.5 ${
                isMine
                  ? 'bg-[#c6f3bf]/80 border-[#008069] text-[#111b21]'
                  : 'bg-[#f0f2f5] border-[#008069] text-[#111b21]'
              }`}
            >
              <CornerDownRight className="w-3 h-3 text-[#008069] flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-[#008069] truncate">
                  {message.replyTo.sender.fullName}
                </p>
                <p className="text-[10px] sm:text-[11px] text-[#54656f] truncate mt-0.5 whitespace-pre-line">
                  {message.replyTo.content || 'Ek / Medya'}
                </p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {message.attachments.map((att) => {
                const isImage = att.mimeType.startsWith('image/');
                if (isImage) {
                  return (
                    <div
                      key={att.id}
                      onClick={() => onImageClick(att.fileUrl, att.fileName)}
                      className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition border border-gray-200 max-w-xs sm:max-w-sm"
                    >
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="w-full max-h-52 sm:max-h-64 object-cover"
                      />
                    </div>
                  );
                }

                return (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    download={att.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-white/80 hover:bg-white border border-[#e9edef] transition text-left group shadow-xs"
                  >
                    <div className="p-1.5 rounded-lg bg-[#008069]/10 text-[#008069]">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#111b21] truncate group-hover:underline">{att.fileName}</p>
                      <p className="text-[9px] sm:text-[10px] text-[#667781]">
                        {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#667781] group-hover:text-[#008069] flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Message Text Content */}
          {message.content && (
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-[#111b21]">{message.content}</p>
          )}

          {/* 🌟 CHAT-TO-TASK EMBEDDED BADGE / CARD 🌟 */}
          {message.task && (
            <div className="mt-2 p-2 sm:p-2.5 rounded-xl bg-[#f0f2f5] border border-[#e9edef] shadow-xs">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#008069] flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-[#111b21] truncate">{message.task.title}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Edit Task Button */}
                  <button
                    onClick={() => onEditTask(message.task!)}
                    title="Görevi Düzenle"
                    className="p-1 rounded-lg bg-white text-[#54656f] hover:text-[#008069] border border-[#e9edef] transition shadow-xs"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  {/* Status Dropdown */}
                  <select
                    value={message.task.status}
                    onChange={(e) => handleTaskStatusChange(message.task!.id, e.target.value as TaskStatus)}
                    className={`text-[9px] sm:text-[10px] font-semibold rounded-lg px-1.5 py-0.5 border focus:outline-none transition shadow-xs ${
                      message.task.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : message.task.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : message.task.status === 'CANCELLED'
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

              {/* Task Details Pill */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-[#54656f] pt-1.5 border-t border-[#e9edef]">
                <span className="flex items-center gap-1">
                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#008069]" />
                  <span className="text-[#111b21] font-medium truncate max-w-[80px] sm:max-w-none">
                    {message.task.assignedTo?.fullName || 'Atanmamış'}
                  </span>
                </span>
                {message.task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#008069]" />
                    <span>{new Date(message.task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </span>
                )}
                <span className="px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] bg-white border border-[#e9edef] text-[#54656f]">
                  {message.task.priority === 'URGENT' ? '🚨 Acil' : message.task.priority === 'HIGH' ? '⚡ Yüksek' : 'Normal'}
                </span>
              </div>
            </div>
          )}

          {/* Timestamp & Status */}
          <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] sm:text-[10px] text-[#667781]">
            <span>{timeFormatted}</span>
            {isMine && <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#53bdeb]" />}
          </div>
        </div>

        {/* Hover Context Trigger Button for Desktop */}
        <button
          onClick={(e) => onOpenContextMenu(e, message)}
          className="hidden sm:block absolute top-1 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white/90 text-[#54656f] hover:text-[#111b21] transition shadow-md border border-[#e9edef]"
          title="Seçenekler"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Reactions Bar at bottom of bubble */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {Object.entries(reactionGroups).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReactionClick(message.id, emoji)}
                title={data.users.join(', ')}
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs border transition shadow-xs ${
                  data.hasReacted
                    ? 'bg-[#008069]/15 border-[#008069] text-[#008069] scale-105 font-bold'
                    : 'bg-white border-[#e9edef] text-[#54656f] hover:bg-[#f0f2f5]'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[9px] sm:text-[10px] font-semibold">{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
