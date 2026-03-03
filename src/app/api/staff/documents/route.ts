import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { ok, err } from "@/lib/response";

// GET — list documents for an employee
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  if (!employeeId) return err("employeeId required");

  // Staff can only view their own documents
  if (payload.role === "STAFF") {
    const me = await prisma.employee.findUnique({ where: { userId: payload.userId } });
    if (!me || me.id !== parseInt(employeeId)) return err("Forbidden", 403);
  }

  const docs = await prisma.document.findMany({
    where: { employeeId: parseInt(employeeId) },
    orderBy: { uploadedAt: "desc" },
  });

  return ok(docs);
}

// POST — upload a document
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { employeeId, name, type, fileData, fileType } = await req.json();
  if (!employeeId || !name || !fileData) return err("employeeId, name, and fileData are required");

  // 10MB limit
  if (fileData.length > 13_500_000) return err("File too large. Maximum size is 10MB.");

  const sizeBytes = Math.round((fileData.length * 3) / 4);

  const doc = await prisma.document.create({
    data: {
      employeeId: parseInt(employeeId),
      name,
      type: type || fileType || "other",
      url: fileData,   // store base64 in url field
      size: sizeBytes,
    },
  });

  await prisma.auditLog.create({
    data: { userId: payload.userId, action: "UPLOAD_DOCUMENT", entity: "Document", entityId: doc.id },
  });

  return ok(doc, 201);
}

// DELETE — remove a document
export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (!["ADMIN", "MANAGER"].includes(payload.role)) return err("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return err("docId required");

  const doc = await prisma.document.findUnique({ where: { id: parseInt(docId) } });
  if (!doc) return err("Document not found", 404);

  await prisma.document.delete({ where: { id: parseInt(docId) } });
  await prisma.auditLog.create({
    data: { userId: payload.userId, action: "DELETE_DOCUMENT", entity: "Document", entityId: parseInt(docId) },
  });

  return ok({ message: "Document deleted" });
}
