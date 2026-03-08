import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

function workingDays(start: Date, end: Date) {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employeeId");

  let where: any = {};
  if (payload.role === "STAFF") {
    const emp = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!emp) return err("Employee not found", 404);
    where.employeeId = emp.id;
  } else if (employeeId) {
    where.employeeId = parseInt(employeeId);
  }
  if (status) where.status = status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { include: { user: { select: { name: true, avatar: true } }, department: { select: { name: true } } } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(requests);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { type, startDate, endDate, reason, employeeId: targetEmpId } = await req.json();
  if (!type || !startDate || !endDate) return err("type, startDate and endDate are required");

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return err("End date must be after start date");

  let employeeId: number;
  if (["ADMIN", "MANAGER"].includes(payload.role) && targetEmpId) {
    employeeId = parseInt(targetEmpId);
  } else {
    const emp = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!emp) return err("Employee record not found", 404);
    employeeId = emp.id;
  }

  const days = workingDays(start, end);

  const request = await prisma.leaveRequest.create({
    data: { employeeId, type, startDate: start, endDate: end, days, reason: reason || null },
    include: { employee: { include: { user: { select: { name: true } } } } },
  });

  return ok(request, 201);
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { id, action, reviewNote } = await req.json();
  if (!id || !action) return err("id and action required");

  const request = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
  if (!request) return err("Request not found", 404);

  // Staff can only cancel their own
  if (payload.role === "STAFF") {
    if (action !== "cancel") return err("Forbidden", 403);
    const emp = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!emp || request.employeeId !== emp.id) return err("Forbidden", 403);
    if (request.status !== "PENDING") return err("Only pending requests can be cancelled");
    await prisma.leaveRequest.update({ where: { id: request.id }, data: { status: "CANCELLED" } });
    return ok({ message: "Request cancelled" });
  }

  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);
  if (!["approve", "reject"].includes(action)) return err("Invalid action");
  if (request.status !== "PENDING") return err("Request already resolved");

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedById: payload.userId,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
    },
    include: { employee: { include: { user: { select: { name: true } } } } },
  });

  // Update employee status if approved leave starts today or is ongoing
  if (action === "approve") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (request.startDate <= today && request.endDate >= today) {
      await prisma.employee.update({ where: { id: request.employeeId }, data: { status: "ON_LEAVE" } });
    }
  }

  return ok(updated);
}

export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN"].includes(payload.role)) return err("Forbidden", 403);

  const { id } = await req.json();
  await prisma.leaveRequest.delete({ where: { id: parseInt(id) } });
  return ok({ message: "Deleted" });
}
