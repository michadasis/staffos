import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import { sendRegistrationApprovedEmail, sendRegistrationRejectedEmail, sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  // Show both UNVERIFIED (waiting for email verify) and PENDING (verified, waiting for admin)
  const pending = await prisma.user.findMany({
    where: { status: { in: ["PENDING", "UNVERIFIED"] } },
    select: { id: true, name: true, email: true, status: true, emailVerified: true, createdAt: true, employee: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(pending);
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden — only admins can approve registrations", 403);

  const { userId, action, departmentId } = await req.json();
  if (!userId || !["approve", "reject"].includes(action)) return err("userId and action required");

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, emailVerified: true, status: true } });
  if (!targetUser) return err("User not found", 404);

  if (action === "approve") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        emailVerified: true, // admin approval bypasses email verification
        verifyToken: null,
        verifyTokenExpiry: null,
        employee: { update: { status: "ACTIVE", ...(departmentId ? { departmentId } : {}) } },
      },
    });
    sendRegistrationApprovedEmail(targetUser.email, targetUser.name).catch(() => {});
  } else {
    await prisma.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
    sendRegistrationRejectedEmail(targetUser.email, targetUser.name).catch(() => {});
  }

  await prisma.auditLog.create({
    data: { userId: payload.userId, action: action === "approve" ? "APPROVE_REGISTRATION" : "REJECT_REGISTRATION", entity: "User", entityId: userId },
  });

  return ok({ message: action === "approve" ? "User approved successfully" : "User rejected" });
}

// POST — admin manually resends verification email to an UNVERIFIED user
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { userId } = await req.json();
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return err("User not found", 404);
  if (targetUser.emailVerified) return err("Email already verified");

  const verifyToken2 = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { verifyToken: verifyToken2, verifyTokenExpiry: expiry },
  });

  sendVerificationEmail(targetUser.email, targetUser.name, verifyToken2)
    .catch((e) => console.error("[email error]", e.message));

  return ok({ message: "Verification email resent" });
}
