export type UserRole = 'ADMIN' | 'MEMBER';
export type GroupRole = 'ADMIN' | 'MEMBER';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
}

export interface AttachmentItem {
  id: string;
  messageId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface MessageReactionItem {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
  };
}

export interface TaskAssigneeItem {
  id?: string;
  taskId?: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    email?: string;
  };
}

export interface TaskItem {
  id: string;
  groupId: string;
  messageId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdById: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  assignees?: TaskAssigneeItem[];
}

export interface MessageItem {
  id: string;
  groupId: string;
  senderId: string;
  content: string | null;
  type: MessageType;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string | null;
    sender: {
      id: string;
      fullName: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role: UserRole;
  };
  attachments?: AttachmentItem[];
  reactions?: MessageReactionItem[];
  task?: TaskItem | null;
}

export interface GroupMemberItem {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    role: UserRole;
  };
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  members: GroupMemberItem[];
  unreadCount?: number;
  lastMessage?: MessageItem | null;
}
