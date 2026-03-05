import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { notifTaskAssigned: true, notifNewMessage: true, notifAnnouncements: true, notifWeeklyDigest: true },
  });
  if (!user) return err("User not found", 404);
  return ok(user);
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { notifTaskAssigned, notifNewMessage, notifAnnouncements, notifWeeklyDigest } = await req.json();

  const user = await prisma.user.update({
    where: { id: payload.userId },
    data: {
      ...(notifTaskAssigned !== undefined && { notifTaskAssigned }),
      ...(notifNewMessage !== undefined && { notifNewMessage }),
      ...(notifAnnouncements !== undefined && { notifAnnouncements }),
      ...(notifWeeklyDigest !== undefined && { notifWeeklyDigest }),
    },
    select: { notifTaskAssigned: true, notifNewMessage: true, notifAnnouncements: true, notifWeeklyDigest: true },
  });
  return ok(user);
}
