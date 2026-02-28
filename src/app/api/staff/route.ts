import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err, paginated } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const dept = searchParams.get("department");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = {};
  if (dept) where.employee = { ...where.employee, department: { name: dept } };
  if (status) where.employee = { ...where.employee, status };
  if (search) where.OR = [
    { name: { contains: search } },
    { email: { contains: search } },
    { employee: { jobTitle: { contains: search } } },
  ];

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, name: true, role: true, avatar: true,
        employee: {
          include: {
            department: true,
            _count: { select: { assignedTasks: true } },
            supervisor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return paginated(users, total, page, limit);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { name, email, password, role, departmentId, jobTitle, phone, supervisorId } = await req.json();
  if (!name || !email || !password) return err("Name, email, and password are required");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return err("Email already in use", 409);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      name,
      role: role || "STAFF",
      employee: {
        create: { jobTitle, phone, departmentId, supervisorId, status: "ACTIVE" },
      },
    },
    include: { employee: { include: { department: true } } },
  });

  return ok({ id: user.id, email: user.email, name: user.name, role: user.role, employee: user.employee }, 201);
}
