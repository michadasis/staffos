import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const task = await prisma.task.findUnique({
    where: { id: parseInt(id) },
    include: {
      department: true,
      assignee: { include: { user: { select: { name: true, avatar: true, email: true } } } },
      createdBy: { include: { user: { select: { name: true } } } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) return err("Task not found", 404);
  return ok(task);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const body = await req.json();
  const { title, description, status, priority, departmentId, assigneeId, deadline } = body;

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) {
    data.status = status;
    if (status === "COMPLETED") data.completedAt = new Date();
    else data.completedAt = null;
  }
  if (priority !== undefined) data.priority = priority;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (assigneeId !== undefined) data.assigneeId = assigneeId;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;

  const task = await prisma.task.update({
    where: { id: parseInt(id) },
    data,
    include: {
      department: true,
      assignee: { include: { user: { select: { name: true, avatar: true } } } },
      createdBy: { include: { user: { select: { name: true } } } },
      _count: { select: { comments: true } },
    },
  });
  return ok(task);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  await prisma.task.delete({ where: { id: parseInt(id) } });
  return ok({ message: "Task deleted" });
}