import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendPendingRegistrationEmail, sendResendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

// GET — verify token from email link
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return err("Missing token", 400);

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) return err("Invalid or expired verification link", 400);
  if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
    return err("Verification link has expired. Please request a new one.", 400);
  }
  if (user.emailVerified) return ok({ message: "Email already verified" });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      status: "PENDING",
      verifyToken: null,
      verifyTokenExpiry: null,
    },
  });

  // Notify admins now that email is verified
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { name: true, email: true },
  });
  admins.forEach((admin) => {
    sendPendingRegistrationEmail(admin.email, admin.name, user.name, user.email).catch(() => {});
  });

  return ok({ message: "Email verified successfully. Please wait for admin approval." });
}

// POST — resend verification email
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return err("Email required");

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return ok({ message: "If that email exists, a verification link has been sent." });
  if (user.emailVerified) return err("Email is already verified");
  if (user.status !== "UNVERIFIED") return err("Account is not awaiting verification");

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: token, verifyTokenExpiry: expiry },
  });

  sendResendVerificationEmail(user.email, user.name, token).catch(() => {});

  return ok({ message: "Verification email sent." });
}
