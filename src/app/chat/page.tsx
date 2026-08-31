'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageItem from '@/components/chat/MessageItem';
import MessageInput from '@/components/chat/MessageInput';
import ContextMenu from '@/components/chat/ContextMenu';
import LightboxModal from '@/components/chat/LightboxModal';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import CompleteTaskModal from '@/components/task/CompleteTaskModal';
import EditTaskModal from '@/components/task/EditTaskModal';
import TaskSidePanel from '@/components/task/TaskSidePanel';
import { UserSession, GroupItem, MessageItem as MessageItemType, TaskItem } from '@/lib/types';
import { getSocket, resetSocket } from '@/lib/socket';
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
      if (newTask.groupId === activeGroupId) {
        setTasks((prev) => [newTask, ...prev]);
      }
    };

    const handleTaskUpdated = (updatedTask: TaskItem) => {
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
    };
  }, [currentUser, activeGroupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 🎯 Scroll to specific message and flash highlight
  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('highlight-message');
      void el.offsetWidth;
      el.classList.add('highlight-message');
    }
  };

  // Actions
  const handleSendMessage = (content?: string, attachments?: any[], replyToId?: string) => {
    if (!activeGroupId) return;
    const socket = getSocket();
    socket.emit('send_message', {
      groupId: activeGroupId,
      content,
      replyToId,
      attachments,
    });
  };

  const handleDeleteMessage = (msg: MessageItemType) => {
    const socket = getSocket();
    socket.emit('delete_message', { messageId: msg.id });
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
    resetSocket();
    router.push('/login');
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  return (
    <div className="h-[100dvh] w-screen flex bg-[#0b141a] text-[#e9edef] overflow-hidden">
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

      {/* 2. Main Chat Area */}
      {activeGroup ? (
        <main
          className={`flex-1 h-full flex flex-col relative chat-bg-pattern min-w-0 ${
            activeMobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat Header */}
          <ChatHeader
            group={activeGroup}
            taskCount={tasks.length}
            isTaskPanelOpen={isTaskPanelOpen}
            onToggleTaskPanel={() => setIsTaskPanelOpen(!isTaskPanelOpen)}
            typingUsers={typingUsers}
            currentUser={currentUser}
            onBackToSidebar={() => setActiveMobileView('sidebar')}
            onDeleteGroup={handleDeleteGroup}
          />

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1"
          >
            {/* Top Date Header */}
            <div className="flex justify-center my-2">
              <span className="px-3 py-1 rounded-lg bg-[#111b21]/80 border border-[#222e35] text-[10px] sm:text-[11px] text-[#8696a0]">
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
        </main>
      ) : (
        <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${activeMobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>
          <MessageSquare className="w-16 h-16 text-[#8696a0]/40 mb-4" />
          <h3 className="text-lg font-semibold text-white">Sohbet Seçin</h3>
          <p className="text-xs text-[#8696a0] max-w-sm mt-1">
            Mesajlaşmaya başlamak veya görev oluşturmak için soldaki listeden bir sohbet grubu seçin.
          </p>
        </div>
      )}

      {/* 3. Right Task Side Panel */}
      <TaskSidePanel
        isOpen={isTaskPanelOpen}
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
          onDeleteMessage={handleDeleteMessage}
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
    </div>
  );
}
