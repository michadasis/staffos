import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

// GET — list attendance records (admin/manager: all or by employeeId; staff: own)
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month"); // YYYY-MM
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "31");

  let where: any = {};

  if (payload.role === "STAFF") {
    const emp = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!emp) return err("Employee not found", 404);
    where.employeeId = emp.id;
  } else if (employeeId) {
    where.employeeId = parseInt(employeeId);
  }

  if (month) {
    const [year, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1),
    };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { include: { user: { select: { name: true } }, department: { select: { name: true } } } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return ok({ records, total, page, pages: Math.ceil(total / limit) });
}

// POST — create or update attendance record
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { employeeId, date, status, clockIn, clockOut, note } = await req.json();
  if (!employeeId || !date || !status) return err("employeeId, date and status are required");

  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: parseInt(employeeId), date: dateObj } },
    create: {
      employeeId: parseInt(employeeId),
      date: dateObj,
      status,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      note: note || null,
    },
    update: {
      status,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      note: note || null,
    },
    include: { employee: { include: { user: { select: { name: true } } } } },
  });

  return ok(record);
}

// DELETE — remove a record
export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { id } = await req.json();
  await prisma.attendance.delete({ where: { id: parseInt(id) } });
  return ok({ message: "Record deleted" });
}
