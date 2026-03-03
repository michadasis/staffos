import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, departmentId, jobTitle } = await req.json();

    if (!name || !email || !password) return err("Name, email, and password are required");
    if (password.length < 8) return err("Password must be at least 8 characters");

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return err("An account with this email already exists", 409);

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name.trim(),
        role: "STAFF",
        status: "PENDING",
        employee: {
          create: {
            jobTitle: jobTitle || null,
            departmentId: departmentId || null,
            status: "INACTIVE",
          },
        },
      },
    });

    return ok({ message: "Registration submitted. Please wait for admin approval before logging in." }, 201);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
