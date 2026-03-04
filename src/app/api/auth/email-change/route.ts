import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import { sendEmailChangeConfirmationEmail, sendEmailChangeRequestEmail } from "@/lib/email";

// POST — request an email change
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { newEmail } = await req.json();
  if (!newEmail?.trim()) return err("New email is required");

  const emailLower = newEmail.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) return err("This email is already in use");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return err("User not found", 404);
  if (emailLower === user.email) return err("That is already your current email");

  const changeToken = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Admins and managers — store pending + send confirmation to new address
  if (["ADMIN", "MANAGER"].includes(payload.role)) {
    await prisma.user.update({
      where: { id: payload.userId },
      data: { pendingEmail: emailLower, emailChangeToken: changeToken, emailChangeTokenExpiry: expiry },
    });
    sendEmailChangeConfirmationEmail(emailLower, user.name, changeToken, emailLower)
      .catch((e) => console.error("[email error]", e.message));
    return ok({ message: `A confirmation link has been sent to ${emailLower}. Click it to complete the change.`, applied: false });
  }

  // Staff — create a pending approval request
  await prisma.emailChangeRequest.updateMany({
    where: { userId: payload.userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  await prisma.emailChangeRequest.create({
    data: { userId: payload.userId, currentEmail: user.email, newEmail: emailLower },
  });

  const reviewers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] }, status: "ACTIVE" },
    select: { name: true, email: true },
  });
  reviewers.forEach((r) => {
    sendEmailChangeRequestEmail(r.email, r.name, user.name, user.email, emailLower).catch(() => {});
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

// PATCH — approve or reject a staff request — sends confirmation email to new address
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
    const taken = await prisma.user.findUnique({ where: { email: request.newEmail } });
    if (taken) {
      await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
      return err("Email is no longer available — request rejected");
    }

    const changeToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store pending change on user, don't apply yet
    await prisma.user.update({
      where: { id: request.userId },
      data: { pendingEmail: request.newEmail, emailChangeToken: changeToken, emailChangeTokenExpiry: expiry },
    });
    await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "APPROVED", resolvedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "APPROVE_EMAIL_CHANGE", entity: "EmailChangeRequest", entityId: requestId },
    });

    // Send confirmation to the new address
    const targetUser = await prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } });
    if (targetUser) {
      sendEmailChangeConfirmationEmail(request.newEmail, targetUser.name, changeToken, request.newEmail)
        .catch((e) => console.error("[email error]", e.message));
    }

    return ok({ message: "Approved — a confirmation link has been sent to the new email address." });
  } else {
    await prisma.emailChangeRequest.update({ where: { id: requestId }, data: { status: "REJECTED", resolvedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: payload.userId, action: "REJECT_EMAIL_CHANGE", entity: "EmailChangeRequest", entityId: requestId },
    });
    return ok({ message: "Email change rejected" });
  }
}
