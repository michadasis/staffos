import { NextRequest } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import { sendTwoFactorChangedEmail } from "@/lib/email";

// GET — generate a new secret + QR code for setup
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return err("User not found", 404);

  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `StaffOS (${user.email})`,
    issuer: "StaffOS",
    length: 20,
  });

  // Temporarily store the secret (unconfirmed) on the user
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret.base32 },
  });

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return ok({ qrCode: qrCodeUrl, secret: secret.base32 });
}

// POST — verify the code and enable 2FA
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { code } = await req.json();
  if (!code) return err("Verification code required");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.twoFactorSecret) return err("No 2FA setup in progress");

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: code.replace(/\s/g, ""),
    window: 2,
  });

  if (!valid) return err("Invalid code. Please try again.");

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "ENABLE_2FA", entity: "User", entityId: user.id },
  });
  sendTwoFactorChangedEmail(user.email, user.name, true).catch(() => {});
  return ok({ message: "2FA enabled successfully" });
}

// DELETE — disable 2FA
export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { code } = await req.json();
  if (!code) return err("Verification code required to disable 2FA");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.twoFactorSecret) return err("2FA is not enabled");

  const valid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: code.replace(/\s/g, ""),
    window: 2,
  });

  if (!valid) return err("Invalid code. Please try again.");

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "DISABLE_2FA", entity: "User", entityId: user.id },
  });
  sendTwoFactorChangedEmail(user.email, user.name, false).catch(() => {});
  return ok({ message: "2FA disabled successfully" });
}
