import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const partnerId = parseInt(userId);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: payload.userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: payload.userId },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { senderId: partnerId, receiverId: payload.userId, read: false },
    data: { read: true },
  });

  return ok(messages);
}