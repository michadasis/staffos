import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { verifyToken } from "@/lib/jwt";
import { err } from "@/lib/response";

// Helpers
function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return err("Unauthorized", 401);
  let payload;
  try { payload = verifyToken(token); } catch { return err("Invalid token", 401); }
  if (payload.role !== "ADMIN") return err("Forbidden — only admins can create backups", 403);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";   // json | csv
  const table  = searchParams.get("table")  || "all";    // all | users | employees | tasks | ...

  // Fetch all data
  const [users, employees, departments, tasks, comments, messages, activityLogs, performanceReports, auditLogs, emailChangeRequests] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true, twoFactorEnabled: true, createdAt: true, updatedAt: true } }),
    prisma.employee.findMany({ include: { department: true, user: { select: { name: true, email: true } } } }),
    prisma.department.findMany(),
    prisma.task.findMany({ include: { assignee: { include: { user: { select: { name: true } } } }, department: true, createdBy: { include: { user: { select: { name: true } } } } } }),
    prisma.taskComment.findMany({ select: { id: true, taskId: true, authorId: true, content: true, fileName: true, fileType: true, createdAt: true, updatedAt: true } }),
    prisma.message.findMany({ select: { id: true, senderId: true, receiverId: true, content: true, read: true, createdAt: true } }),
    prisma.activityLog.findMany(),
    prisma.performanceReport.findMany(),
    prisma.auditLog.findMany({ include: { user: { select: { name: true, email: true } } } }),
    prisma.emailChangeRequest.findMany({ include: { user: { select: { name: true, email: true } } } }),
  ]);

  const allTables: Record<string, any[]> = {
    users, employees, departments, tasks, taskComments: comments,
    messages, activityLogs, performanceReports, auditLogs, emailChangeRequests,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  if (format === "csv") {
    // Single table CSV download
    const tableData = table === "all" ? allTables.users : allTables[table];
    if (!tableData) return err("Unknown table", 400);

    const csv = toCSV(tableData.map((r) => {
      const flat: any = {};
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === "object" && v !== null && !(v instanceof Date)) {
          flat[k] = JSON.stringify(v);
        } else {
          flat[k] = v;
        }
      }
      return flat;
    }));

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="staffos-${table}-${timestamp}.csv"`,
      },
    });
  }

  // Full JSON backup
  const backup = {
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: payload.email,
      version: "1.0",
      counts: Object.fromEntries(Object.entries(allTables).map(([k, v]) => [k, v.length])),
    },
    data: allTables,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="staffos-backup-${timestamp}.json"`,
    },
  });
}
