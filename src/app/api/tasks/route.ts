import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err, paginated } from "@/lib/response";
import { sendTaskAssignedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const assigneeId = searchParams.get("assigneeId");

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = parseInt(assigneeId);
  if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        department: true,
        assignee: { include: { user: { select: { name: true, avatar: true } } } },
        createdBy: { include: { user: { select: { name: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return paginated(tasks, total, page, limit);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { title, description, priority, status, departmentId, assigneeId, deadline } = await req.json();
  if (!title) return err("Title is required");

  const creator = await prisma.employee.findUnique({ where: { userId: payload.userId } });
  if (!creator) return err("Employee profile not found", 404);

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority: priority || "MEDIUM",
      status: status || "PENDING",
      departmentId,
      assigneeId,
      deadline: deadline ? new Date(deadline) : null,
      createdById: creator.id,
    },
    include: {
      department: true,
      assignee: { include: { user: { select: { name: true, avatar: true } } } },
      createdBy: { include: { user: { select: { name: true } } } },
      _count: { select: { comments: true } },
    },
  });

  // Email the assignee
  if (task.assignee?.user?.email) {
    sendTaskAssignedEmail(
      task.assignee.user.email,
      task.assignee.user.name,
      task.title,
      task.id,
      task.deadline,
      task.priority,
    ).catch((e) => console.error("[email error]", e.message));
  }

  return ok(task, 201);
}
