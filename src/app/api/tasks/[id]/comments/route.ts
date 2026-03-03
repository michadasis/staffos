import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  try { verifyToken(token); } catch { return err("Invalid token", 401); }

  const comments = await prisma.taskComment.findMany({
    where: { taskId: parseInt(id) },
    orderBy: { createdAt: "asc" },
  });

  const enriched = await Promise.all(comments.map(async (c) => {
    const user = await prisma.user.findUnique({ where: { id: c.authorId }, select: { name: true } });
    return { ...c, authorName: user?.name || "Unknown" };
  }));

  return ok(enriched);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const body = await req.json();
  const { content, fileName, fileType, fileData } = body;

  if (!content?.trim() && !fileData) return err("Comment cannot be empty");

  // Limit file size to ~5MB (base64 ~6.7MB string)
  if (fileData && fileData.length > 7_000_000) return err("File too large. Maximum size is 5MB.");

  const comment = await prisma.taskComment.create({
    data: {
      taskId: parseInt(id),
      authorId: payload.userId,
      content: content?.trim() || "",
      fileName: fileName || null,
      fileType: fileType || null,
      fileData: fileData || null,
    },
  });

  return ok({ ...comment, authorName: payload.name }, 201);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");
  if (!commentId) return err("commentId required");

  const comment = await prisma.taskComment.findUnique({ where: { id: parseInt(commentId) } });
  if (!comment) return err("Comment not found", 404);
  if (comment.authorId !== payload.userId && !["ADMIN", "MANAGER"].includes(payload.role)) {
    return err("Forbidden", 403);
  }

  await prisma.taskComment.delete({ where: { id: parseInt(commentId) } });
  return ok({ message: "Deleted" });
}
