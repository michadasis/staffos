import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) return err("Both passwords required");
  if (newPassword.length < 6) return err("New password must be at least 6 characters");

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return err("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return err("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: payload.userId }, data: { password: hashed } });

  return ok({ message: "Password updated successfully" });
}
