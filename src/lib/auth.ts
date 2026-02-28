import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "./jwt";

export const COOKIE_NAME = "staffos_token";

export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // 1. Cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) return cookie;
  // 2. Authorization header
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function requireAuth(roles?: string[]) {
  return (handler: (req: NextRequest, user: JWTPayload, ...args: any[]) => Promise<NextResponse>) => {
    return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
      const token = getTokenFromRequest(req);
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      try {
        const user = verifyToken(token);
        if (roles && !roles.includes(user.role)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return handler(req, user, ...args);
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    };
  };
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME);
}
