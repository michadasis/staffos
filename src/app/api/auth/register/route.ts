import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role = "STAFF", departmentId, jobTitle } = await req.json();

    if (!name || !email || !password) {
      return err("Name, email, and password are required");
    }

    if (password.length < 8) {
      return err("Password must be at least 8 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return err("An account with this email already exists", 409);
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name.trim(),
        role,
        employee: {
          create: {
            jobTitle: jobTitle || null,
            departmentId: departmentId || null,
            status: "ACTIVE",
          },
        },
      },
      include: { employee: { include: { department: true } } },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });

    const response = ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, employee: user.employee },
      token,
    }, 201);

    setAuthCookie(response, token);
    return response;
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
