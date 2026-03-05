import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import { sendAnnouncementEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { subject, body } = await req.json();
  if (!subject?.trim() || !body?.trim()) return err("Subject and body are required");

  const sender = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } });

  // Find all opted-in active users
  const recipients = await prisma.user.findMany({
    where: { status: "ACTIVE", notifAnnouncements: true },
    select: { name: true, email: true },
  });

  let sent = 0;
  await Promise.all(recipients.map(async (r) => {
    try {
      await sendAnnouncementEmail(r.email, r.name, subject, body, sender?.name || "Management");
      sent++;
    } catch (e) {
      console.error(`[email error] announcement to ${r.email}:`, e);
    }
  }));

  await prisma.auditLog.create({
    data: { userId: payload.userId, action: "SEND_ANNOUNCEMENT", entity: "Announcement", entityId: 0, after: { subject, recipientCount: sent } },
  });

  return ok({ message: `Announcement sent to ${sent} recipient${sent !== 1 ? "s" : ""}`, sent });
}
