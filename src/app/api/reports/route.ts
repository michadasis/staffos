import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === "daily")   { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  if (period === "weekly")  { const d = new Date(now); d.setDate(now.getDate() - 7); return d; }
  const d = new Date(now); d.setMonth(now.getMonth() - 1); return d;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type")   || "full";
  const period = searchParams.get("period") || "monthly";
  const start  = getPeriodStart(period);

  // Full report — everything needed for the page + exports
  if (type === "full") {
    const [staff, tasks, departments, messages] = await Promise.all([
      prisma.employee.findMany({
        include: {
          user: { select: { name: true, email: true, role: true, createdAt: true } },
          department: true,
          _count: { select: { assignedTasks: true } },
          assignedTasks: { select: { id: true, status: true, priority: true, createdAt: true, completedAt: true, deadline: true } },
        },
      }),
      prisma.task.findMany({
        where: { createdAt: { gte: start } },
        include: {
          department: true,
          assignee: { include: { user: { select: { name: true } } } },
          createdBy: { include: { user: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.department.findMany(),
      prisma.message.count({ where: { createdAt: { gte: start } } }),
    ]);

    const staffRows = staff.map((e) => {
      const periodTasks = e.assignedTasks.filter((t) => new Date(t.createdAt) >= start);
      const completed   = e.assignedTasks.filter((t) => t.status === "COMPLETED").length;
      const total       = e._count.assignedTasks;
      const overdue     = e.assignedTasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
      return {
        name: e.user.name,
        email: e.user.email,
        role: e.user.role,
        department: e.department?.name || "—",
        status: e.status,
        joinDate: new Date(e.user.createdAt).toLocaleDateString(),
        tasksTotal: total,
        tasksCompleted: completed,
        tasksPeriod: periodTasks.length,
        overdueTasks: overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    // Department stats
    const deptStats = departments.map((d) => {
      const deptTasks = tasks.filter((t) => t.department?.id === d.id);
      const done  = deptTasks.filter((t) => t.status === "COMPLETED").length;
      const total = deptTasks.length;
      const staffCount = staff.filter((e) => e.department?.id === d.id).length;
      const overdue    = deptTasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "COMPLETED").length;
      return { name: d.name, staffCount, tasksTotal: total, tasksCompleted: done, overdueTasks: overdue, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 };
    });

    // Task summary
    const taskSummary = {
      total:       tasks.length,
      pending:     tasks.filter((t) => t.status === "PENDING").length,
      inProgress:  tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed:   tasks.filter((t) => t.status === "COMPLETED").length,
      cancelled:   tasks.filter((t) => t.status === "CANCELLED").length,
      overdue:     tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !["COMPLETED","CANCELLED"].includes(t.status)).length,
      critical:    tasks.filter((t) => t.priority === "CRITICAL").length,
      high:        tasks.filter((t) => t.priority === "HIGH").length,
    };

    const taskRows = tasks.map((t) => ({
      title:      t.title,
      status:     t.status,
      priority:   t.priority,
      assignee:   t.assignee?.user?.name || "Unassigned",
      department: t.department?.name || "—",
      createdBy:  t.createdBy?.user?.name || "—",
      deadline:   t.deadline ? new Date(t.deadline).toLocaleDateString() : "—",
      comments:   t._count.comments,
      createdAt:  new Date(t.createdAt).toLocaleDateString(),
    }));

    return ok({
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalStaff:    staff.length,
        activeStaff:   staff.filter((e) => e.status === "ACTIVE").length,
        totalTasks:    tasks.length,
        completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
        overallRate:   tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100) : 0,
        messagesSent:  messages,
        departments:   departments.length,
      },
      taskSummary,
      staffRows,
      taskRows,
      deptStats,
    });
  }

  // Legacy staff type
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
      name: e.user.name, email: e.user.email, role: e.user.role,
      department: e.department?.name, status: e.status, joinDate: e.joinDate,
      tasksTotal: e._count.assignedTasks, tasksCompleted: e.assignedTasks.length,
      completionRate: e._count.assignedTasks > 0 ? Math.round((e.assignedTasks.length / e._count.assignedTasks) * 100) : 0,
    })));
  }

  return err("Unknown report type", 400);
}
