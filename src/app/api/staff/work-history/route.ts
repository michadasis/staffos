import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

// GET — fetch work history for an employee
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const employeeId = parseInt(searchParams.get("employeeId") || "");
  if (!employeeId) return err("employeeId required");

  // Staff can only view their own history
  if (payload.role === "STAFF") {
    const me = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!me || me.id !== employeeId) return err("Forbidden", 403);
  }

  const history = await prisma.workHistory.findMany({
    where: { employeeId },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { occurredAt: "desc" },
  });

  return ok(history);
}

// POST — add a manual work history entry
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { employeeId, type, title, description, fromValue, toValue, occurredAt } = await req.json();
  if (!employeeId || !type || !title) return err("employeeId, type, and title are required");

  const entry = await prisma.workHistory.create({
    data: {
      employeeId: parseInt(employeeId),
      type,
      title,
      description: description || null,
      fromValue: fromValue || null,
      toValue: toValue || null,
      recordedById: payload.userId,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
    include: { recordedBy: { select: { name: true } } },
  });

  return ok(entry, 201);
}

// DELETE — remove a manual entry (admin only)
export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return err("id required");

  await prisma.workHistory.delete({ where: { id } });
  return ok({ message: "Entry deleted" });
}
