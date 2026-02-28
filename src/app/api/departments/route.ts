import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true, tasks: true } } },
    orderBy: { name: "asc" },
  });
  return ok(departments);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden", 403);

  const { name, description } = await req.json();
  if (!name) return err("Name is required");

  const dept = await prisma.department.create({ data: { name, description } });
  return ok(dept, 201);
}
