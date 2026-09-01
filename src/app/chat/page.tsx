'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatHeader, { MainViewType } from '@/components/chat/ChatHeader';
import MessageItem from '@/components/chat/MessageItem';
import MessageInput from '@/components/chat/MessageInput';
import ContextMenu from '@/components/chat/ContextMenu';
import LightboxModal from '@/components/chat/LightboxModal';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import CompleteTaskModal from '@/components/task/CompleteTaskModal';
import EditTaskModal from '@/components/task/EditTaskModal';
import TaskSidePanel from '@/components/task/TaskSidePanel';
import TaskKanbanView from '@/components/task/TaskKanbanView';
import TaskGridView from '@/components/task/TaskGridView';
import WhatsAppConnectModal, { WhatsAppStatusData } from '@/components/whatsapp/WhatsAppConnectModal';
import {
  UserSession,
  GroupItem,
  MessageItem as MessageItemType,
  TaskItem,
  TaskStatus,
} from '@/lib/types';
import { getSocket } from '@/lib/socket';
import {
  playNotificationSound,
  showDesktopNotification,
  flashTabTitle,
} from '@/lib/notifications';
import { MessageSquare, Shield, CheckSquare } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();

  // Core State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItemType[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // View State: 'chat' | 'kanban' | 'table'
  const [currentView, setCurrentView] = useState<MainViewType>('chat');

  // Mobile View Navigation State: 'sidebar' (list) or 'chat' (active conversation)
  const [activeMobileView, setActiveMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Modals & Panels State
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageItemType | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: MessageItemType } | null>(null);
  const [createTaskMessage, setCreateTaskMessage] = useState<MessageItemType | null>(null);
  const [completeTaskItem, setCompleteTaskItem] = useState<TaskItem | null>(null);
  const [editTaskItem, setEditTaskItem] = useState<TaskItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name?: string } | null>(null);

  // WhatsApp State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waStatus, setWaStatus] = useState<WhatsAppStatusData>({
    status: 'disconnected',
    qrCodeDataUrl: null,
    phone: null,
    pushname: null,
    lastError: null,
    boundGroupId: null,
    boundGroupName: null,
    boundChatId: null,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 1. Check Auth & Load User
  useEffect(() => {
    const token = localStorage.getItem('prjrms_token');
    const storedUser = localStorage.getItem('prjrms_user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      setCurrentUser(JSON.parse(storedUser));
    } catch {
      router.push('/login');
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setCurrentUser(data.user);
        localStorage.setItem('prjrms_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('prjrms_token');
        localStorage.removeItem('prjrms_user');
        router.push('/login');
      });
  }, [router]);

  // 2. Fetch Groups
  const fetchGroups = async () => {
    const token = localStorage.getItem('prjrms_token');
    if (!token) return;

    try {
      const res = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.groups?.length > 0 && !activeGroupId) {
          setActiveGroupId(data.groups[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch groups error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  // 3. Setup Socket & Room Listeners
  useEffect(() => {
    if (!currentUser || !activeGroupId) return;

    const token = localStorage.getItem('prjrms_token') || '';
    const socket = getSocket(token);

    socket.emit('join_group', activeGroupId);

    // Fetch initial messages and tasks for active group
    fetch(`/api/groups/${activeGroupId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      });

    fetch(`/api/groups/${activeGroupId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
      });

    // Socket Event Handlers
    const handleNewMessage = (newMsg: MessageItemType) => {
      // 🔔 Sesli ve Görsel Bildirim (Gelen mesaj başkasına aitse)
      if (newMsg.senderId !== currentUser.id) {
        playNotificationSound('message');
        const senderName = newMsg.sender?.fullName || 'Biri';
        const preview =
          newMsg.content ||
          (newMsg.attachments && newMsg.attachments.length > 0
            ? '📷 Fotoğraf / Dosya eki'
            : 'Yeni mesaj gönderildi');

        flashTabTitle(`(1) 💬 ${senderName}: ${preview}`);
        showDesktopNotification(
          senderName,
          preview,
          newMsg.sender?.avatarUrl || undefined,
          () => {
            setActiveGroupId(newMsg.groupId);
            setActiveMobileView('chat');
          }
        );
      }

      if (newMsg.groupId === activeGroupId) {
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(scrollToBottom, 50);
      }
      setGroups((prev) =>
        prev.map((g) => (g.id === newMsg.groupId ? { ...g, lastMessage: newMsg } : g))
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setTasks((prev) => prev.filter((t) => t.messageId !== messageId));
    };

    const handleGroupDeleted = ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroupId === groupId) {
        setActiveGroupId(null);
        setMessages([]);
        setTasks([]);
        setActiveMobileView('sidebar');
      }
    };

    const handleReactionsUpdated = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleTaskCreated = (newTask: TaskItem) => {
      if (newTask.createdById !== currentUser.id) {
        playNotificationSound('task');
        showDesktopNotification(
          '⚡ Yeni Görev Tanımlandı',
          `"${newTask.title}" - Sorumlu: ${newTask.assignedTo?.fullName || 'Ekip Üyesi'}`
        );
      }
      if (newTask.groupId === activeGroupId) {
        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      }
    };

    const handleTaskUpdated = (updatedTask: TaskItem) => {
      playNotificationSound('task');
      if (updatedTask.groupId === activeGroupId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      }
    };

    const handleMessageTaskUpdated = ({ messageId, task }: { messageId: string; task: TaskItem }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, task } : m))
      );
    };

    const handleUserTyping = ({ groupId, fullName, isTyping }: { groupId: string; fullName: string; isTyping: boolean }) => {
      if (groupId === activeGroupId) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(fullName) ? prev : [...prev, fullName];
          } else {
            return prev.filter((name) => name !== fullName);
          }
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('message_reactions_updated', handleReactionsUpdated);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('message_task_updated', handleMessageTaskUpdated);
    socket.on('user_typing', handleUserTyping);

    // WhatsApp Socket Events
    const handleWaStatus = (data: WhatsAppStatusData) => setWaStatus(data);
    socket.on('whatsapp_status', handleWaStatus);

    return () => {
      socket.emit('leave_group', activeGroupId);
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('message_reactions_updated', handleReactionsUpdated);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('message_task_updated', handleMessageTaskUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('whatsapp_status', handleWaStatus);
    };
  }, [currentUser, activeGroupId]);

  // Fetch WhatsApp status on mount
  useEffect(() => {
    const token = localStorage.getItem('prjrms_token');
    if (!token) return;
    fetch('/api/whatsapp/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setWaStatus(data); })
      .catch(() => {});
  }, []);

  const refreshWaStatus = async () => {
    const token = localStorage.getItem('prjrms_token');
    if (!token) return;
    try {
      const r = await fetch('/api/whatsapp/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setWaStatus(await r.json());
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 🎯 Scroll to specific message and flash highlight
  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-[#008069]/15', 'ring-2', 'ring-[#008069]', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-[#008069]/15', 'ring-2', 'ring-[#008069]');
      }, 2500);
    }
  };

  // Jump from Kanban/Table directly to Chat and highlight the message
  const handleJumpToMessage = (messageId: string) => {
    setCurrentView('chat');
    setTimeout(() => {
      handleScrollToMessage(messageId);
    }, 150);
  };

  // Direct status change from Kanban / Grid
  const handleDirectStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'COMPLETED') {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setCompleteTaskItem(task);
        return;
      }
    }

    const socket = getSocket();
    socket.emit('edit_task', {
      taskId,
      status: newStatus,
    });
  };

  const handleSendMessage = (content?: string, attachments?: any[], replyToId?: string) => {
    if (!activeGroupId) return;
    const socket = getSocket();
    socket.emit('send_message', {
      groupId: activeGroupId,
      content: content || null,
      type: attachments && attachments.length > 0 ? (attachments[0].mimeType?.startsWith('image/') ? 'IMAGE' : 'FILE') : 'TEXT',
      replyToId: replyToId || replyingTo?.id,
      attachments,
    });
    setReplyingTo(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    const socket = getSocket();
    socket.emit('delete_message', { messageId });
  };

  const handleDeleteGroup = async (groupId: string) => {
    const token = localStorage.getItem('prjrms_token');
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchGroups();
        setActiveGroupId(null);
        setActiveMobileView('sidebar');
      }
    } catch (err) {
      console.error('Delete group error:', err);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const socket = getSocket();
    socket.emit('add_reaction', { messageId, emoji });
  };

  const handleTypingStart = () => {
    if (!activeGroupId) return;
    const socket = getSocket();
    socket.emit('typing_start', { groupId: activeGroupId });
  };

  const handleTypingStop = () => {
    if (!activeGroupId) return;
    const socket = getSocket();
    socket.emit('typing_stop', { groupId: activeGroupId });
  };

  const handleLogout = () => {
    localStorage.removeItem('prjrms_token');
    localStorage.removeItem('prjrms_user');
    router.push('/login');
  };

  if (loading || !currentUser) {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#008069] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#54656f]">PRJrms Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  return (
    <div className="h-[100dvh] w-screen flex bg-[#efeae2] text-[#111b21] overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(id) => {
          setActiveGroupId(id);
          setReplyingTo(null);
          setActiveMobileView('chat');
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserCreated={fetchGroups}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
        className={`${activeMobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
      />

      {/* 2. Main Area (Chat | Kanban | Plan Tablosu) */}
      {activeGroup ? (
        <main
          className={`flex-1 h-full flex flex-col relative chat-bg-pattern min-w-0 ${
            activeMobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat / View Header */}
          <ChatHeader
            group={activeGroup}
            taskCount={tasks.length}
            isTaskPanelOpen={isTaskPanelOpen}
            onToggleTaskPanel={() => setIsTaskPanelOpen(!isTaskPanelOpen)}
            typingUsers={typingUsers}
            currentUser={currentUser}
            currentView={currentView}
            onChangeView={(view) => setCurrentView(view)}
            onBackToSidebar={() => setActiveMobileView('sidebar')}
            onDeleteGroup={handleDeleteGroup}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            waStatus={waStatus}
          />

          {/* VIEW 1: CHAT STREAM */}
          {currentView === 'chat' && (
            <>
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1"
              >
                {/* Top Date Header */}
                <div className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-white/90 border border-[#e9edef] text-[10px] sm:text-[11px] text-[#54656f] shadow-xs">
                    Bugün
                  </span>
                </div>

                {messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    currentUser={currentUser}
                    onOpenContextMenu={(coords, m) => {
                      setContextMenu({ x: coords.clientX, y: coords.clientY, message: m });
                    }}
                    onImageClick={(url, name) => setLightboxImage({ url, name })}
                    onScrollToMessage={handleScrollToMessage}
                    onReactionClick={handleReaction}
                    onRequestCompleteTask={(task) => setCompleteTaskItem(task)}
                    onEditTask={(task) => setEditTaskItem(task)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <MessageInput
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
              />
            </>
          )}

          {/* VIEW 2: KANBAN BOARD */}
          {currentView === 'kanban' && (
            <TaskKanbanView
              tasks={tasks}
              members={activeGroup.members}
              currentUser={currentUser}
              onEditTask={(task) => setEditTaskItem(task)}
              onCompleteTask={(task) => setCompleteTaskItem(task)}
              onStatusChange={handleDirectStatusChange}
              onJumpToMessage={handleJumpToMessage}
            />
          )}

          {/* VIEW 3: PLAN EXCEL / TABLE VIEW */}
          {currentView === 'table' && (
            <TaskGridView
              tasks={tasks}
              members={activeGroup.members}
              currentUser={currentUser}
              onEditTask={(task) => setEditTaskItem(task)}
              onCompleteTask={(task) => setCompleteTaskItem(task)}
              onStatusChange={handleDirectStatusChange}
              onJumpToMessage={handleJumpToMessage}
            />
          )}
        </main>
      ) : (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] ${activeMobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>
          <MessageSquare className="w-16 h-16 text-[#8696a0]/40 mb-4" />
          <h3 className="text-lg font-semibold text-[#111b21]">Sohbet Seçin</h3>
          <p className="text-xs text-[#54656f] max-w-sm mt-1">
            Mesajlaşmaya başlamak veya görev oluşturmak için soldaki listeden bir sohbet grubu seçin.
          </p>
        </div>
      )}

      {/* 3. Right Task Side Panel */}
      <TaskSidePanel
        isOpen={isTaskPanelOpen && currentView === 'chat'}
        onClose={() => setIsTaskPanelOpen(false)}
        tasks={tasks}
        onScrollToMessage={handleScrollToMessage}
        onRequestCompleteTask={(task) => setCompleteTaskItem(task)}
        onEditTask={(task) => setEditTaskItem(task)}
      />

      {/* 4. Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          currentUser={currentUser}
          onClose={() => setContextMenu(null)}
          onConvertToTask={(msg) => setCreateTaskMessage(msg)}
          onReply={(msg) => setReplyingTo(msg)}
          onReaction={handleReaction}
          onDeleteMessage={(msg) => handleDeleteMessage(msg.id)}
        />
      )}

      {/* 5. Create Task Modal */}
      {activeGroup && (
        <CreateTaskModal
          isOpen={!!createTaskMessage}
          onClose={() => setCreateTaskMessage(null)}
          message={createTaskMessage}
          members={activeGroup.members}
          groupId={activeGroup.id}
        />
      )}

      {/* 6. Edit Task Modal */}
      {activeGroup && (
        <EditTaskModal
          isOpen={!!editTaskItem}
          onClose={() => setEditTaskItem(null)}
          task={editTaskItem}
          members={activeGroup.members}
        />
      )}

      {/* 7. Complete Task Modal with Required Note & Auto Notification */}
      <CompleteTaskModal
        isOpen={!!completeTaskItem}
        onClose={() => setCompleteTaskItem(null)}
        task={completeTaskItem}
      />

      {/* 8. Lightbox Preview Modal */}
      <LightboxModal
        imageUrl={lightboxImage ? lightboxImage.url : null}
        fileName={lightboxImage?.name}
        onClose={() => setLightboxImage(null)}
      />

      {/* 9. WhatsApp Connect Modal */}
      {activeGroup && (
        <WhatsAppConnectModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          currentGroupId={activeGroup.id}
          currentGroupName={activeGroup.name}
          waStatus={waStatus}
          onRefresh={refreshWaStatus}
        />
      )}
    </div>
  );
}
