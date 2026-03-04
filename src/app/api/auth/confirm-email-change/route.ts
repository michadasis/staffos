import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return err("Missing token", 400);

  const user = await prisma.user.findUnique({ where: { emailChangeToken: token } });
  if (!user) return err("Invalid or expired confirmation link", 400);
  if (user.emailChangeTokenExpiry && user.emailChangeTokenExpiry < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: null, emailChangeToken: null, emailChangeTokenExpiry: null },
    });
    return err("This confirmation link has expired. Please request a new email change.", 400);
  }
  if (!user.pendingEmail) return err("No pending email change found", 400);

  // Check the new email is still available
  const taken = await prisma.user.findUnique({ where: { email: user.pendingEmail } });
  if (taken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: null, emailChangeToken: null, emailChangeTokenExpiry: null },
    });
    return err("This email address is no longer available.", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeTokenExpiry: null,
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "EMAIL_CHANGED", entity: "User", entityId: user.id },
  });

  return ok({ message: "Email address updated successfully. You can now log in with your new email." });
}
