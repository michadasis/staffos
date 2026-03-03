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
  if (payload.userId !== userId && !["ADMIN", "MANAGER"].includes(payload.role)) {
    return err("Forbidden", 403);
  }

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
  await prisma.auditLog.create({
    data: { userId: payload.userId, action: "UPDATE_STAFF", entity: "User", entityId: userId, after: body },
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

  const userId = parseInt(id);

  // Prevent deleting yourself
  if (payload.userId === userId) return err("You cannot delete your own account", 400);

  try {
    // Manually clean up related records that don't cascade
    await prisma.$transaction(async (tx) => {
      // Remove sent/received messages
      await tx.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
      // Remove audit logs
      await tx.auditLog.deleteMany({ where: { userId } });
      // Get employee id
      const employee = await tx.employee.findUnique({ where: { userId } });
      if (employee) {
        // Unassign tasks instead of deleting them
        await tx.task.updateMany({ where: { assigneeId: employee.id }, data: { assigneeId: null } });
        // Delete activity logs
        await tx.activityLog.deleteMany({ where: { employeeId: employee.id } });
        // Delete performance reports
        await tx.performanceReport.deleteMany({ where: { employeeId: employee.id } });
        // Delete documents
        await tx.document.deleteMany({ where: { employeeId: employee.id } });
        // Remove supervisor references
        await tx.employee.updateMany({ where: { supervisorId: employee.id }, data: { supervisorId: null } });
        // Delete task comments by this employee's tasks (created tasks)
        const createdTasks = await tx.task.findMany({ where: { createdById: employee.id }, select: { id: true } });
        await tx.taskComment.deleteMany({ where: { taskId: { in: createdTasks.map(t => t.id) } } });
        // Delete tasks created by this employee
        await tx.task.deleteMany({ where: { createdById: employee.id } });
      }
      // Finally delete the user (cascades to employee)
      await tx.user.delete({ where: { id: userId } });
    });

    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "DELETE_STAFF", entity: "User", entityId: userId },
    });
    return ok({ message: "Employee deleted successfully" });
  } catch (e: any) {
    console.error("Delete error:", e);
    return err(`Failed to delete employee: ${e.message}`, 500);
  }
}
