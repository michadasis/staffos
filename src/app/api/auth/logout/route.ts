import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  const response = ok({ message: "Logged out" });
  clearAuthCookie(response);
  return response;
}
