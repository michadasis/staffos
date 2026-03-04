import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import { sendNewMessageEmail } from "@/lib/email";

// GET /api/messages - get all conversations (inbox)
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const userId = payload.userId;

  // Get unique conversation partners
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group into conversations
  const convMap = new Map<number, any>();
  for (const msg of messages) {
    const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const partner = msg.senderId === userId ? msg.receiver : msg.sender;
    if (!convMap.has(partnerId)) {
      const unread = messages.filter(
        (m) => m.senderId === partnerId && m.receiverId === userId && !m.read
      ).length;
      convMap.set(partnerId, { partner, lastMessage: msg, unread });
    }
  }

  return ok(Array.from(convMap.values()));
}

// POST /api/messages - send a message
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { receiverId, content } = await req.json();
  if (!receiverId || !content) return err("receiverId and content are required");

  const message = await prisma.message.create({
    data: { senderId: payload.userId, receiverId, content },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true, email: true } },
    },
  });

  // Send email notification (fire-and-forget)
  if (message.receiver?.email) {
    sendNewMessageEmail(message.receiver.email, message.sender.name, content).catch((e) => console.error("[email error]", e.message));
  }

  return ok(message, 201);
}
