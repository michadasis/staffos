import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const [activeStaff, pendingTasks, inProgressTasks, completedTasks, totalStaff, employees, depts] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({ where: { status: "PENDING" } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.employee.count(),
      prisma.employee.findMany({
        take: 10,
        include: {
          user: { select: { name: true, avatar: true } },
          _count: { select: { assignedTasks: true } },
          assignedTasks: { where: { status: "COMPLETED" }, select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.department.findMany({
        include: {
          employees: {
            include: {
              assignedTasks: { select: { status: true } },
            },
          },
        },
      }),
    ]);

  const topPerformers = employees
    .map((e) => ({
      name: e.user.name,
      avatar: e.user.avatar,
      total: e._count.assignedTasks,
      completed: e.assignedTasks.length,
      rate: e._count.assignedTasks > 0 ? Math.round((e.assignedTasks.length / e._count.assignedTasks) * 100) : 0,
    }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);

  const departmentStats = depts.map((d) => {
    const allTasks = d.employees.flatMap((e) => e.assignedTasks);
    const done = allTasks.filter((t) => t.status === "COMPLETED").length;
    return {
      name: d.name,
      count: d.employees.length,
      rate: allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0,
    };
  });

  // 6-month task activity
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });

  const tasksByMonth = await Promise.all(
    months.map(async (d) => {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [assigned, completed] = await Promise.all([
        prisma.task.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.task.count({ where: { completedAt: { gte: start, lte: end }, status: "COMPLETED" } }),
      ]);
      return {
        month: d.toLocaleString("default", { month: "short" }),
        assigned,
        completed,
      };
    })
  );

  return ok({ activeStaff, pendingTasks, inProgressTasks, completedTasks, totalStaff, tasksByMonth, topPerformers, departmentStats });
}
