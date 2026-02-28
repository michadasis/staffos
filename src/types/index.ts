export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  name: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  employee?: EmployeeProfile | null;
}

export interface EmployeeProfile {
  id: number;
  userId: number;
  jobTitle?: string | null;
  phone?: string | null;
  address?: string | null;
  joinDate: string;
  status: EmployeeStatus;
  department?: { id: number; name: string } | null;
  supervisor?: { id: number; user: { name: string } } | null;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  employee: {
    id: number;
    jobTitle?: string | null;
    status: EmployeeStatus;
    joinDate: string;
    department?: { id: number; name: string } | null;
    _count?: { assignedTasks: number };
  } | null;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string | null;
  completedAt?: string | null;
  createdAt: string;
  department?: { id: number; name: string } | null;
  assignee?: { id: number; user: { name: string; avatar?: string | null } } | null;
  createdBy: { id: number; user: { name: string } };
  _count?: { comments: number };
}

export interface Message {
  id: number;
  content: string;
  read: boolean;
  createdAt: string;
  sender: { id: number; name: string; avatar?: string | null };
  receiver: { id: number; name: string; avatar?: string | null };
}

export interface DashboardStats {
  activeStaff: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalStaff: number;
  tasksByMonth: { month: string; assigned: number; completed: number }[];
  topPerformers: { name: string; avatar?: string | null; rate: number; completed: number; total: number }[];
  departmentStats: { name: string; rate: number; count: number }[];
}
