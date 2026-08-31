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
      <div id={`msg-${message.id}`} className="flex justify-center my-2 transition duration-300">
        <div className="px-3.5 py-1 rounded-full bg-[#111b21]/90 border border-[#222e35] text-[10px] sm:text-[11px] text-[#8696a0] flex items-center gap-1.5 shadow-sm text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
          {message.content}
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
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#202c33] object-cover flex-shrink-0 mb-1 border border-[#2a3942]"
        />
      )}

      {/* Message Bubble Container */}
      <div className="relative max-w-[88%] sm:max-w-[75%] md:max-w-[65%]">
        {/* Bubble */}
        <div
          className={`rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-md relative ${
            isMine
              ? 'bg-[#005c4b] text-[#e9edef] rounded-br-xs'
              : 'bg-[#202c33] text-[#e9edef] rounded-bl-xs'
          }`}
        >
          {/* Sender Name in Group */}
          {!isMine && (
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#00a884] mb-0.5 sm:mb-1 flex items-center gap-1.5">
              <span>{message.sender.fullName}</span>
              {message.sender.role === 'ADMIN' && (
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-normal">
                  Yönetici
                </span>
              )}
            </p>
          )}

          {/* Reply Quote Banner */}
          {message.replyTo && (
            <div
              onClick={() => onScrollToMessage(message.replyTo!.id)}
              className={`mb-1.5 sm:mb-2 p-1.5 sm:p-2 rounded-xl text-xs cursor-pointer border-l-3 transition flex items-start gap-1.5 sm:gap-2 ${
                isMine
                  ? 'bg-[#025142] border-[#00a884]/80 text-[#e9edef]'
                  : 'bg-[#111b21] border-[#00a884] text-[#e9edef]'
              }`}
            >
              <CornerDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00a884] flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-[#00a884] truncate">
                  {message.replyTo.sender.fullName}
                </p>
                <p className="text-[10px] sm:text-[11px] text-[#8696a0] truncate mt-0.5 whitespace-pre-line">
                  {message.replyTo.content || 'Ek / Medya'}
                </p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2 mb-1.5 sm:mb-2">
              {message.attachments.map((att) => {
                const isImage = att.mimeType.startsWith('image/');
                if (isImage) {
                  return (
                    <div
                      key={att.id}
                      onClick={() => onImageClick(att.fileUrl, att.fileName)}
                      className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition border border-black/20 max-w-xs sm:max-w-sm"
                    >
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="w-full max-h-56 sm:max-h-64 object-cover"
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
                    className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 transition text-left group"
                  >
                    <div className="p-1.5 sm:p-2 rounded-lg bg-[#00a884]/20 text-[#00a884]">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate group-hover:underline">{att.fileName}</p>
                      <p className="text-[9px] sm:text-[10px] text-[#8696a0]">
                        {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8696a0] group-hover:text-[#00a884] flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Message Text Content */}
          {message.content && (
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* 🌟 CHAT-TO-TASK EMBEDDED BADGE / CARD 🌟 */}
          {message.task && (
            <div className="mt-2 p-2 sm:p-2.5 rounded-xl bg-[#111b21]/90 border border-[#2a3942] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00a884] flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-[#e9edef] truncate">{message.task.title}</span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Edit Task Button */}
                  <button
                    onClick={() => onEditTask(message.task!)}
                    title="Görevi Düzenle"
                    className="p-1 rounded bg-[#202c33] text-[#8696a0] hover:text-[#00a884] transition"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  {/* Status Dropdown inside message card */}
                  <select
                    value={message.task.status}
                    onChange={(e) => handleTaskStatusChange(message.task!.id, e.target.value as TaskStatus)}
                    className={`text-[9px] sm:text-[10px] font-semibold rounded-lg px-1.5 py-0.5 border focus:outline-none transition flex-shrink-0 ${
                      message.task.status === 'COMPLETED'
                        ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                        : message.task.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : message.task.status === 'CANCELLED'
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

              {/* Task Details Pill */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-[#8696a0] pt-1.5 border-t border-[#2a3942]/60">
                <span className="flex items-center gap-1">
                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#00a884]" />
                  <span className="text-white font-medium truncate max-w-[80px] sm:max-w-none">
                    {message.task.assignedTo?.fullName || 'Atanmamış'}
                  </span>
                </span>
                {message.task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#00a884]" />
                    <span>{new Date(message.task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </span>
                )}
                <span className="px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] bg-[#202c33] text-[#8696a0]">
                  {message.task.priority === 'URGENT' ? '🚨 Acil' : message.task.priority === 'HIGH' ? '⚡ Yüksek' : 'Normal'}
                </span>
              </div>
            </div>
          )}

          {/* Timestamp & Status */}
          <div className="flex items-center justify-end gap-1 mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] text-[#8696a0]">
            <span>{timeFormatted}</span>
            {isMine && <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00a884]" />}
          </div>
        </div>

        {/* Hover Context Trigger Button for Desktop */}
        <button
          onClick={(e) => onOpenContextMenu(e, message)}
          className="hidden sm:block absolute top-1 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition shadow"
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
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs border transition shadow-sm ${
                  data.hasReacted
                    ? 'bg-[#00a884]/25 border-[#00a884] text-white scale-105'
                    : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
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
