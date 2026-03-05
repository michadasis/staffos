import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendWeeklyDigestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err("Unauthorized", 401);
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", notifWeeklyDigest: true },
    select: {
      id: true, name: true, email: true,
      employee: {
        include: {
          assignedTasks: {
            where: { status: { not: "CANCELLED" } },
            select: { title: true, status: true, priority: true, deadline: true },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const user of users) {
    const tasks = user.employee?.assignedTasks || [];
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== "COMPLETED");
    const inProgress = tasks.filter(t => t.status === "IN_PROGRESS");
    const pending = tasks.filter(t => t.status === "PENDING");
    const completedThisWeek = await prisma.task.count({
      where: {
        assignee: { userId: user.id },
        status: "COMPLETED",
        updatedAt: { gte: weekAgo },
      },
    });

    // Get unread message count
    const unreadMessages = await prisma.message.count({
      where: { receiverId: user.id, createdAt: { gte: weekAgo } },
    });

    try {
      await sendWeeklyDigestEmail(user.email, user.name, {
        overdueCount: overdue.length,
        inProgressCount: inProgress.length,
        pendingCount: pending.length,
        completedThisWeek,
        unreadMessages,
        overdueTasks: overdue.slice(0, 5),
      });
      sent++;
    } catch (e) {
      console.error(`[cron] digest failed for ${user.email}:`, e);
    }
  }

  console.log(`[cron] weekly digest sent to ${sent}/${users.length} users`);
  return ok({ sent, total: users.length });
}
