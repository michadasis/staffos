import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "staff";
  const period = searchParams.get("period") || "monthly";

  const now = new Date();
  let start: Date;
  if (period === "daily") {
    start = new Date(now); start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    start = new Date(now); start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now); start.setMonth(now.getMonth() - 1);
  }

  if (type === "staff") {
    const staff = await prisma.employee.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        department: true,
        _count: { select: { assignedTasks: true } },
        assignedTasks: { where: { status: "COMPLETED" }, select: { id: true } },
      },
    });
    return ok(staff.map((e) => ({
      name: e.user.name,
      email: e.user.email,
      role: e.user.role,
      department: e.department?.name,
      status: e.status,
      joinDate: e.joinDate,
      tasksTotal: e._count.assignedTasks,
      tasksCompleted: e.assignedTasks.length,
      completionRate: e._count.assignedTasks > 0 ? Math.round((e.assignedTasks.length / e._count.assignedTasks) * 100) : 0,
    })));
  }

  if (type === "tasks") {
    const tasks = await prisma.task.findMany({
      where: { createdAt: { gte: start } },
      include: {
        department: true,
        assignee: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(tasks);
  }

  return err("Unknown report type", 400);
}
