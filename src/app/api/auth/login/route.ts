import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const { email, password, twoFactorCode } = await req.json();

    if (!email || !password) return err("Email and password are required");

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { employee: { include: { department: true } } },
    });

    if (!user) return err("Invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return err("Invalid credentials", 401);

    if (user.status === "PENDING") {
      return err("Your account is awaiting admin approval.", 403);
    }
    if (user.status === "REJECTED") {
      return err("Your registration was not approved. Please contact your administrator.", 403);
    }

    // If 2FA is enabled, require the code
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        // Signal to the client that 2FA is required (not an error per se)
        return ok({ requiresTwoFactor: true }, 200);
      }

      const validCode = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorCode.replace(/\s/g, ""),
        window: 2,
      });

      if (!validCode) return err("Invalid 2FA code. Please try again.", 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
    });

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        employee: user.employee,
      },
      token,
    });

    setAuthCookie(response, token);
    return response;
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
