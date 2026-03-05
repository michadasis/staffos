import nodemailer from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://staffos.app";

function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

async function send(to: string, subject: string, html: string) {
  if (!isConfigured()) {
    console.log(`[email] Not configured. Would send to ${to}: ${subject}`);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: `"StaffOS" <${process.env.GMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px">
<tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:#1e293b;border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid #334155">
  <span style="font-size:20px;font-weight:800;color:#f1f5f9">StaffOS</span>
</td></tr>
<tr><td style="background:#1e293b;padding:32px">${content}</td></tr>
<tr><td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #1e293b">
  <p style="margin:0;font-size:11px;color:#475569;text-align:center">You're receiving this because you have an account on <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none">StaffOS</a>.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (text: string, url: string, color = "#3b82f6") =>
  `<a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;margin-top:24px">${text}</a>`;
const h1 = (text: string) =>
  `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f1f5f9">${text}</h1>`;
const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.6">${text}</p>`;
const badge = (text: string, color = "#3b82f6") =>
  `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}30;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">${text}</span>`;
const divider = () =>
  `<div style="height:1px;background:#334155;margin:24px 0"></div>`;

export async function sendNewMessageEmail(to: string, senderName: string, preview: string) {
  await send(to, `New message from ${senderName}`, layout(`
    ${h1(`New message from ${senderName}`)}
    ${p("You have a new direct message:")}
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 20px;margin:16px 0">
      <p style="margin:0;font-size:14px;color:#cbd5e1;font-style:italic">"${preview.slice(0, 200)}${preview.length > 200 ? "…" : ""}"</p>
    </div>
    ${btn("Open Messages", `${APP_URL}/messages`)}
  `));
}

export async function sendTaskAssignedEmail(to: string, recipientName: string, taskTitle: string, taskId: number, deadline?: Date | null, priority?: string) {
  const priorityColors: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e" };
  const color = priority ? (priorityColors[priority] || "#3b82f6") : "#3b82f6";
  await send(to, `New task assigned: ${taskTitle}`, layout(`
    ${h1("You've been assigned a task")}
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#f1f5f9">${taskTitle}</p>
      ${priority ? badge(priority, color) : ""}
      ${deadline ? `&nbsp;${badge(`Due ${new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, "#64748b")}` : ""}
    </div>
    ${p(`Hello ${recipientName}, a new task has been assigned to you.`)}
    ${btn("View Task", `${APP_URL}/tasks`)}
  `));
}

export async function sendOverdueTaskEmail(to: string, recipientName: string, tasks: { title: string; deadline: Date }[]) {
  const rows = tasks.map((t) =>
    `<tr>
      <td style="padding:10px 12px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #334155">${t.title}</td>
      <td style="padding:10px 12px;font-size:13px;color:#ef4444;border-bottom:1px solid #334155">${new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
    </tr>`
  ).join("");
  await send(to, `You have ${tasks.length} overdue task${tasks.length > 1 ? "s" : ""}`, layout(`
    ${h1(`${tasks.length} overdue task${tasks.length > 1 ? "s" : ""}`)}
    ${p(`Hello ${recipientName}, the following tasks are past their deadline:`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;overflow:hidden;margin:16px 0">
      <thead><tr style="background:#1a2540">
        <th style="padding:10px 12px;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Task</th>
        <th style="padding:10px 12px;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Deadline</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${btn("View Tasks", `${APP_URL}/tasks`, "#ef4444")}
  `));
}

export async function sendPendingRegistrationEmail(to: string, adminName: string, applicantName: string, applicantEmail: string) {
  await send(to, `New registration pending: ${applicantName}`, layout(`
    ${h1("New registration pending")}
    ${p(`Hello ${adminName}, a new user has registered and is awaiting your approval.`)}
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#f1f5f9">${applicantName}</p>
      <p style="margin:0;font-size:13px;color:#94a3b8">${applicantEmail}</p>
    </div>
    ${btn("Review in Staff Page", `${APP_URL}/staff`, "#f59e0b")}
  `));
}

export async function sendRegistrationApprovedEmail(to: string, name: string) {
  await send(to, "Your registration has been approved", layout(`
    ${h1("Welcome to StaffOS!")}
    ${p(`Hello ${name}, your registration has been approved. You can now sign in.`)}
    ${btn("Sign In", `${APP_URL}/login`, "#22c55e")}
  `));
}

export async function sendRegistrationRejectedEmail(to: string, name: string) {
  await send(to, "Your registration was not approved", layout(`
    ${h1("Registration not approved")}
    ${p(`Hello ${name}, unfortunately your registration was not approved at this time.`)}
    ${p("Please contact your administrator if you believe this is a mistake.")}
  `));
}

export async function sendEmailChangeRequestEmail(to: string, adminName: string, requesterName: string, currentEmail: string, newEmail: string) {
  await send(to, `Email change request from ${requesterName}`, layout(`
    ${h1("Email change request")}
    ${p(`Hello ${adminName}, ${requesterName} has requested to change their email address.`)}
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#64748b;padding-bottom:6px">Current</td><td style="font-size:13px;color:#f1f5f9;text-align:right;text-decoration:line-through">${currentEmail}</td></tr>
        <tr><td style="font-size:12px;color:#64748b">New</td><td style="font-size:13px;color:#3b82f6;text-align:right;font-weight:700">${newEmail}</td></tr>
      </table>
    </div>
    ${btn("Review Request", `${APP_URL}/staff`)}
  `));
}

export async function sendEmailChangeApprovedEmail(to: string, name: string, newEmail: string) {
  await send(to, "Your email change has been approved", layout(`
    ${h1("Email change approved")}
    ${p(`Hello ${name}, your email has been updated to <strong style="color:#f1f5f9">${newEmail}</strong>.`)}
    ${p("Please use your new email address to sign in from now on.")}
    ${btn("Sign In", `${APP_URL}/login`)}
  `));
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  await send(to, "Your password was changed", layout(`
    ${h1("Password changed")}
    ${p(`Hello ${name}, your StaffOS password was just changed.`)}
    ${p("If you did not make this change, contact your administrator immediately.")}
    ${divider()}
    ${p(`<span style="font-size:12px;color:#64748b">Changed at: ${new Date().toLocaleString()}</span>`)}
  `));
}

export async function sendTwoFactorChangedEmail(to: string, name: string, enabled: boolean) {
  const action = enabled ? "enabled" : "disabled";
  await send(to, `Two-factor authentication ${action}`, layout(`
    ${h1(`2FA ${action}`)}
    ${p(`Hello ${name}, two-factor authentication has been ${action} on your account.`)}
    ${p("If you did not make this change, contact your administrator immediately.")}
    ${divider()}
    ${p(`<span style="font-size:12px;color:#64748b">Changed at: ${new Date().toLocaleString()}</span>`)}
  `));
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await send(to, "Verify your StaffOS email address", layout(`
    ${h1("Verify your email")}
    ${p(`Hello ${name}, thanks for registering. Please verify your email address to continue.`)}
    ${p("This link expires in 24 hours.")}
    ${btn("Verify Email Address", url, "#22c55e")}
    ${divider()}
    ${p(`<span style="font-size:11px;color:#64748b">Or paste this link into your browser:<br><a href="${url}" style="color:#3b82f6;word-break:break-all">${url}</a></span>`)}
  `));
}

export async function sendResendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await send(to, "New verification link for StaffOS", layout(`
    ${h1("New verification link")}
    ${p(`Hello ${name}, here is your new email verification link.`)}
    ${p("This link expires in 24 hours.")}
    ${btn("Verify Email Address", url, "#22c55e")}
  `));
}

export async function sendEmailChangeConfirmationEmail(to: string, name: string, token: string, newEmail: string) {
  const url = `${APP_URL}/confirm-email-change?token=${token}`;
  await send(to, "Confirm your new email address", layout(`
    ${h1("Confirm your new email")}
    ${p(`Hello ${name}, please confirm that you want to change your email address to <strong style="color:#f1f5f9">${newEmail}</strong>.`)}
    ${p("This link expires in 24 hours. If you did not request this change, you can ignore this email.")}
    ${btn("Confirm New Email", url, "#3b82f6")}
    ${divider()}
    ${p(`<span style="font-size:11px;color:#64748b">Or paste this link: <a href="${url}" style="color:#3b82f6;word-break:break-all">${url}</a></span>`)}
  `));
}
// email helpers

export async function sendAnnouncementEmail(to: string, name: string, subject: string, body: string, senderName: string) {
  await send(to, `[Announcement] ${subject}`, layout(`
    ${h1(subject)}
    ${p(`Hello ${name}, you have a new announcement from <strong style="color:#f1f5f9">${senderName}</strong>.`)}
    ${divider()}
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin:16px 0">
      <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;white-space:pre-wrap">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    ${divider()}
    ${p(`<span style="font-size:11px;color:#475569">You received this because you have team announcements enabled. You can turn this off in your notification settings.</span>`)}
  `));
}

export async function sendWeeklyDigestEmail(to: string, name: string, stats: {
  overdueCount: number;
  inProgressCount: number;
  pendingCount: number;
  completedThisWeek: number;
  unreadMessages: number;
  overdueTasks: { title: string; deadline: Date | null; priority: string }[];
}) {
  const { overdueCount, inProgressCount, pendingCount, completedThisWeek, unreadMessages, overdueTasks } = stats;

  const statBox = (value: number, label: string, color: string) =>
    `<td style="text-align:center;padding:16px 12px;background:#0f172a;border:1px solid #334155;border-radius:12px">
      <div style="font-size:28px;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">${label}</div>
    </td>`;

  const overdueRows = overdueTasks.map(t =>
    `<tr>
      <td style="padding:8px 12px;font-size:12px;color:#f1f5f9;border-bottom:1px solid #1e293b">${t.title}</td>
      <td style="padding:8px 12px;font-size:12px;color:#ef4444;border-bottom:1px solid #1e293b">${t.deadline ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No deadline"}</td>
    </tr>`
  ).join("");

  const now = new Date();
  const weekLabel = `${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })} week`;

  await send(to, `Your weekly digest - ${weekLabel}`, layout(`
    ${h1("Your weekly digest")}
    ${p(`Hello ${name}, here is a summary of your activity this week.`)}
    ${divider()}
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:separate;border-spacing:8px">
      <tr>
        ${statBox(completedThisWeek, "Completed", "#22c55e")}
        ${statBox(inProgressCount, "In Progress", "#3b82f6")}
        ${statBox(pendingCount, "Pending", "#eab308")}
        ${statBox(overdueCount, "Overdue", "#ef4444")}
      </tr>
    </table>
    ${unreadMessages > 0 ? `
    ${divider()}
    <div style="background:#1e293b;border:1px solid #3b82f620;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px">
      <span style="font-size:20px">💬</span>
      <span style="font-size:13px;color:#94a3b8">You received <strong style="color:#f1f5f9">${unreadMessages}</strong> message${unreadMessages !== 1 ? "s" : ""} this week</span>
    </div>` : ""}
    ${overdueCount > 0 ? `
    ${divider()}
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#ef4444">Overdue tasks</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;overflow:hidden">
      <thead><tr style="background:#1a2540">
        <th style="padding:8px 12px;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Task</th>
        <th style="padding:8px 12px;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Deadline</th>
      </tr></thead>
      <tbody>${overdueRows}</tbody>
    </table>` : ""}
    ${divider()}
    ${btn("View My Tasks", `${APP_URL}/tasks`)}
    ${divider()}
    ${p(`<span style="font-size:11px;color:#475569">You received this weekly digest because you have it enabled. You can turn it off in your notification settings.</span>`)}
  `));
}
// email helpers
