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
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const page    = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const search  = searchParams.get("search") || "";
  const action  = searchParams.get("action") || "";
  const entity  = searchParams.get("entity") || "";
  const userId  = searchParams.get("userId") || "";

  const where: any = {};
  if (action)  where.action = action;
  if (entity)  where.entity = entity;
  if (userId)  where.userId = parseInt(userId);
  if (search)  where.OR = [
    { action: { contains: search } },
    { entity: { contains: search } },
    { user: { name: { contains: search } } },
  ];

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Distinct filter options
  const [actions, entities, users] = await Promise.all([
    prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return ok({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    filters: {
      actions: actions.map((a) => a.action),
      entities: entities.map((e) => e.entity),
      users,
    },
  });
}
