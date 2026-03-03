import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

// GET /api/staff/pending — list pending registrations
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const pending = await prisma.user.findMany({
    where: { status: "PENDING" },
    select: {
      id: true, name: true, email: true, createdAt: true,
      employee: { include: { department: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(pending);
}

// PATCH /api/staff/pending — approve or reject a user
export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden — only admins can approve registrations", 403);

  const { userId, action, departmentId } = await req.json();
  if (!userId || !["approve", "reject"].includes(action)) return err("userId and action (approve/reject) required");

  if (action === "approve") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        employee: {
          update: {
            status: "ACTIVE",
            ...(departmentId ? { departmentId } : {}),
          },
        },
      },
    });
    return ok({ message: "User approved successfully" });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "REJECTED" },
    });
    return ok({ message: "User rejected" });
  }
}
