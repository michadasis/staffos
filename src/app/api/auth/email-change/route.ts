import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

// POST — request an email change (staff) or apply directly (admin/manager)
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { newEmail } = await req.json();
  if (!newEmail?.trim()) return err("New email is required");

  const emailLower = newEmail.toLowerCase().trim();

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) return err("This email is already in use");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return err("User not found", 404);

  if (emailLower === user.email) return err("That is already your current email");

  // Admins and managers can change directly
  if (["ADMIN", "MANAGER"].includes(payload.role)) {
    await prisma.user.update({ where: { id: payload.userId }, data: { email: emailLower } });
    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "EMAIL_CHANGED", entity: "User", entityId: payload.userId },
    });
    return ok({ message: "Email updated successfully", applied: true });
  }

  // Staff — create a pending request (cancel any previous pending ones first)
  await prisma.emailChangeRequest.updateMany({
    where: { userId: payload.userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  await prisma.emailChangeRequest.create({
    data: { userId: payload.userId, currentEmail: user.email, newEmail: emailLower },
  });

  return ok({ message: "Email change request submitted. An admin will review it shortly.", applied: false });
}

// GET — list pending email change requests (admin/manager only)
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const requests = await prisma.emailChangeRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(requests);
}

// PATCH — approve or reject a request (admin/manager only)
export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { requestId, action } = await req.json();
  if (!requestId || !["approve", "reject"].includes(action)) return err("requestId and action required");

  const request = await prisma.emailChangeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") return err("Request not found or already resolved");

  if (action === "approve") {
    // Check email still available
    const taken = await prisma.user.findUnique({ where: { email: request.newEmail } });
    if (taken) {
      await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
      return err("Email is no longer available — request rejected");
    }
    await prisma.user.update({ where: { id: request.userId }, data: { email: request.newEmail } });
    await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "APPROVED", resolvedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "APPROVE_EMAIL_CHANGE", entity: "EmailChangeRequest", entityId: requestId },
    });
    return ok({ message: "Email change approved" });
  } else {
    await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "REJECT_EMAIL_CHANGE", entity: "EmailChangeRequest", entityId: requestId },
    });
    return ok({ message: "Email change rejected" });
  }
}
