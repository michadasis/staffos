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

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true, email: true, name: true, role: true, avatar: true, createdAt: true,
      employee: {
        include: {
          department: true,
          supervisor: { include: { user: { select: { name: true, email: true } } } },
          documents: true,
          assignedTasks: { include: { department: true }, orderBy: { createdAt: "desc" }, take: 10 },
          activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
          _count: { select: { assignedTasks: true } },
        },
      },
    },
  });
  if (!user) return err("User not found", 404);
  return ok(user);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const userId = parseInt(id);
  if (payload.userId !== userId && !["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const body = await req.json();
  const { name, role, departmentId, jobTitle, phone, address, status, supervisorId } = body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(role && payload.role === "ADMIN" && { role }),
      employee: {
        update: {
          ...(departmentId !== undefined && { departmentId }),
          ...(jobTitle !== undefined && { jobTitle }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(status && { status }),
          ...(supervisorId !== undefined && { supervisorId }),
        },
      },
    },
    include: { employee: { include: { department: true } } },
  });
  return ok(user);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden", 403);

  await prisma.user.delete({ where: { id: parseInt(id) } });
  return ok({ message: "User deleted" });
}