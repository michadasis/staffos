import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

const DEFAULTS: Record<string, string> = {
  payrollEnabled: "false",
  payrollProvider: "",
  payrollCurrency: "USD",
  payrollPayDay: "25",
};

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const rows = await prisma.systemSetting.findMany();
  const settings: Record<string, string> = { ...DEFAULTS };
  rows.forEach(r => { settings[r.key] = r.value; });
  return ok(settings);
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden — only admins can change system settings", 403);

  const updates: Record<string, string> = await req.json();

  await Promise.all(Object.entries(updates).map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value), updatedById: payload.userId },
      update: { value: String(value), updatedById: payload.userId },
    })
  ));

  await prisma.auditLog.create({
    data: { userId: payload.userId, action: "UPDATE_SYSTEM_SETTINGS", entity: "SystemSetting", entityId: 0, after: updates },
  });

  return ok({ message: "Settings updated" });
}
