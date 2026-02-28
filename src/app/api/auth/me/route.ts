import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, name: true, role: true, avatar: true,
        employee: { include: { department: true, supervisor: { include: { user: { select: { name: true } } } } } },
      },
    });
    if (!user) return err("User not found", 404);
    return ok(user);
  } catch {
    return err("Invalid token", 401);
  }
}
