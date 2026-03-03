import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const employee = await prisma.employee.findUnique({ where: { userId: payload.userId } });

  const notifications: any[] = [];

  // Pending registrations (admin only)
  if (payload.role === "ADMIN") {
    const pendingCount = await prisma.user.count({ where: { status: "PENDING" } });
    if (pendingCount > 0) {
      notifications.push({
        id: `pending-registrations`,
        type: "pending",
        icon: "⏳",
        text: `${pendingCount} registration${pendingCount > 1 ? "s" : ""} awaiting your approval`,
        time: new Date().toISOString(),
        read: false,
        link: "/staff",
      });
    }
  }

  // Unread messages
  const unreadMessages = await prisma.message.findMany({
    where: { receiverId: payload.userId, read: false },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  unreadMessages.forEach((m) => {
    notifications.push({
      id: `msg-${m.id}`,
      type: "message",
      icon: "💬",
      text: `${m.sender.name} sent you a message`,
      time: m.createdAt,
      read: false,
      link: "/messages",
    });
  });

  // Tasks assigned to this employee (last 7 days)
  if (employee) {
    const recentTasks = await prisma.task.findMany({
      where: {
        assigneeId: employee.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    recentTasks.forEach((t) => {
      notifications.push({
        id: `task-${t.id}`,
        type: "task",
        icon: "✅",
        text: `You were assigned: "${t.title}"`,
        time: t.createdAt,
        read: true,
        link: "/tasks",
      });
    });

    // Overdue tasks
    const overdue = await prisma.task.findMany({
      where: {
        assigneeId: employee.id,
        deadline: { lt: new Date() },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      take: 3,
    });
    overdue.forEach((t) => {
      notifications.push({
        id: `overdue-${t.id}`,
        type: "warning",
        icon: "⚠️",
        text: `Overdue task: "${t.title}"`,
        time: t.deadline!,
        read: false,
        link: "/tasks",
      });
    });
  }

  // Sort by time desc
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const unreadCount = notifications.filter((n) => !n.read).length;
  return ok({ notifications: notifications.slice(0, 10), unreadCount });
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }
  // Mark messages as read
  const { userId } = await req.json();
  await prisma.message.updateMany({
    where: { receiverId: userId, read: false },
    data: { read: true },
  });
  return ok({ message: "Marked as read" });
}
