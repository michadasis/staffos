import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, departmentId, jobTitle } = await req.json();

    if (!name || !email || !password) return err("Name, email, and password are required");
    if (password.length < 8) return err("Password must be at least 8 characters");

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return err("An account with this email already exists", 409);

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name.trim(),
        role: "STAFF",
        status: "UNVERIFIED",
        emailVerified: false,
        verifyToken,
        verifyTokenExpiry,
        employee: {
          create: {
            jobTitle: jobTitle || null,
            departmentId: departmentId || null,
            status: "INACTIVE",
          },
        },
      },
    });

    const sent = await sendVerificationEmail(email.toLowerCase().trim(), name.trim(), verifyToken)
      .then(() => true)
      .catch((e) => { console.error("[email error] verification:", e.message); return false; });

    console.log(`[register] user created: ${email}, verification email sent: ${sent}`);

    return ok({ message: "Registration submitted. Please check your email to verify your address." }, 201);
  } catch (e) {
    console.error("[register] error:", e);
    return err("Internal server error", 500);
  }
}
