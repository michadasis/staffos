import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";
import nodemailer from "nodemailer";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden", 403);

  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  if (!configured) {
    return ok({ success: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD env vars are not set" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `"StaffOS" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "StaffOS email test",
      html: "<p>Email is working correctly!</p>",
    });
    return ok({ success: true, sentTo: process.env.GMAIL_USER });
  } catch (e: any) {
    return ok({ success: false, error: e.message });
  }
}
