const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function daysAgo(n, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function clockAt(base, hour, min = 0) {
  const d = new Date(base);
  d.setHours(hour, min, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Departments
  const depts = await Promise.all([
    prisma.department.upsert({ where: { name: "Engineering" }, update: {}, create: { name: "Engineering", description: "Software and infrastructure" } }),
    prisma.department.upsert({ where: { name: "Design" },      update: {}, create: { name: "Design",      description: "UI/UX and brand" } }),
    prisma.department.upsert({ where: { name: "Marketing" },   update: {}, create: { name: "Marketing",   description: "Growth and communications" } }),
    prisma.department.upsert({ where: { name: "Finance" },     update: {}, create: { name: "Finance",     description: "Accounting and budgets" } }),
    prisma.department.upsert({ where: { name: "HR" },          update: {}, create: { name: "HR",          description: "People and culture" } }),
    prisma.department.upsert({ where: { name: "Operations" },  update: {}, create: { name: "Operations",  description: "Business operations" } }),
    prisma.department.upsert({ where: { name: "Sales" },       update: {}, create: { name: "Sales",       description: "Revenue and partnerships" } }),
  ]);
  const deptMap = Object.fromEntries(depts.map((d) => [d.name, d]));

  // Users
  const adminPass = await bcrypt.hash("Admin@123", 12);
  const staffPass = await bcrypt.hash("Staff@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@staffos.com" },
    update: {},
    create: {
      email: "admin@staffos.com",
      password: adminPass,
      name: "Super Admin",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      employee: {
        create: {
          jobTitle: "System Administrator",
          departmentId: deptMap["Operations"].id,
          status: "ACTIVE",
          joinDate: new Date("2020-01-15"),
        },
      },
    },
    include: { employee: true },
  });

  const staffData = [
    { email: "a.chen@staffos.com",     name: "Alexandra Chen",  role: "MANAGER", dept: "Engineering", title: "Engineering Manager",  join: "2020-06-01" },
    { email: "m.williams@staffos.com", name: "Marcus Williams", role: "STAFF",   dept: "Design",      title: "Senior Designer",      join: "2021-03-15" },
    { email: "p.patel@staffos.com",    name: "Priya Patel",     role: "STAFF",   dept: "Marketing",   title: "Marketing Specialist", join: "2021-09-01" },
    { email: "j.okafor@staffos.com",   name: "James Okafor",   role: "MANAGER", dept: "Operations",  title: "Operations Manager",   join: "2020-11-01" },
    { email: "s.martinez@staffos.com", name: "Sofia Martinez",  role: "STAFF",   dept: "Engineering", title: "Software Engineer",    join: "2022-02-01" },
    { email: "l.kim@staffos.com",      name: "Lucas Kim",       role: "STAFF",   dept: "Finance",     title: "Financial Analyst",    join: "2022-05-16" },
    { email: "r.osei@staffos.com",     name: "Rachel Osei",     role: "STAFF",   dept: "HR",          title: "HR Coordinator",       join: "2023-01-09" },
    { email: "d.nguyen@staffos.com",   name: "David Nguyen",    role: "STAFF",   dept: "Sales",       title: "Account Executive",    join: "2023-07-01" },
    { email: "e.brown@staffos.com",    name: "Elena Brown",     role: "STAFF",   dept: "Engineering", title: "Frontend Developer",   join: "2023-10-02" },
    { email: "t.hassan@staffos.com",   name: "Tariq Hassan",    role: "MANAGER", dept: "Finance",     title: "Finance Manager",      join: "2021-06-14" },
  ];

  const createdStaff = [];
  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: staffPass,
        name: s.name,
        role: s.role,
        status: "ACTIVE",
        emailVerified: true,
        employee: {
          create: {
            jobTitle: s.title,
            departmentId: deptMap[s.dept].id,
            status: "ACTIVE",
            joinDate: new Date(s.join),
          },
        },
      },
      include: { employee: true },
    });
    createdStaff.push(user);
  }

  const adminEmp = admin.employee;

  // Tasks
  const taskData = [
    { title: "Q1 Performance Review Documentation",   desc: "Compile and review Q1 performance data for the engineering team.",       priority: "HIGH",   status: "IN_PROGRESS", dept: "Engineering", days: 7 },
    { title: "Redesign Onboarding Flow",              desc: "Revamp the user onboarding experience based on the latest UX research.", priority: "HIGH",   status: "PENDING",     dept: "Design",      days: 14 },
    { title: "Monthly Marketing Report",              desc: "Prepare the monthly analytics and campaign performance report.",          priority: "MEDIUM", status: "COMPLETED",   dept: "Marketing",   days: -2 },
    { title: "Update Employee Handbook",              desc: "Incorporate 2026 policy updates into the employee handbook.",            priority: "LOW",    status: "PENDING",     dept: "HR",          days: 21 },
    { title: "Budget Reconciliation Q1",              desc: "Reconcile all Q1 transactions and prepare summary for CFO review.",      priority: "HIGH",   status: "IN_PROGRESS", dept: "Finance",     days: 4 },
    { title: "Sales Pipeline Analysis",               desc: "Analyse the current pipeline and identify key opportunities.",           priority: "MEDIUM", status: "IN_PROGRESS", dept: "Sales",       days: 9 },
    { title: "Cloud Infrastructure Audit",            desc: "Conduct a full audit of cloud infrastructure for cost optimisation.",    priority: "HIGH",   status: "COMPLETED",   dept: "Engineering", days: -5 },
    { title: "Team Building Event Planning",          desc: "Organise Q2 team building activities and book venues.",                  priority: "LOW",    status: "PENDING",     dept: "Operations",  days: 32 },
    { title: "Candidate Screening - Engineering",     desc: "Review applications and shortlist candidates for three open roles.",     priority: "MEDIUM", status: "PENDING",     dept: "HR",          days: 10 },
    { title: "Frontend Accessibility Audit",          desc: "Audit all customer-facing pages for WCAG 2.1 AA compliance.",           priority: "HIGH",   status: "IN_PROGRESS", dept: "Engineering", days: 12 },
    { title: "Q1 Sales Commission Calculation",       desc: "Calculate and verify commission payouts for the sales team.",           priority: "HIGH",   status: "PENDING",     dept: "Finance",     days: 3 },
    { title: "Social Media Content Calendar",         desc: "Plan and schedule content for all social channels for Q2.",             priority: "MEDIUM", status: "COMPLETED",   dept: "Marketing",   days: -10 },
  ];

  for (const t of taskData) {
    const dept = deptMap[t.dept];
    const deadline = t.days >= 0 ? daysAhead(t.days) : daysAgo(-t.days);
    const assignee = createdStaff.find((u) => u.employee?.departmentId === dept.id);
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.desc,
        priority: t.priority,
        status: t.status,
        departmentId: dept.id,
        deadline,
        completedAt: t.status === "COMPLETED" ? daysAgo(1) : null,
        createdById: adminEmp.id,
        assigneeId: assignee?.employee?.id ?? adminEmp.id,
      },
    });
  }

  // Messages
  await prisma.message.createMany({
    data: [
      { senderId: createdStaff[0].id, receiverId: admin.id,          content: "The Q1 review docs are almost ready, just need your sign-off.", read: false },
      { senderId: createdStaff[1].id, receiverId: admin.id,          content: "Shared the new onboarding wireframes in the design folder.", read: false },
      { senderId: createdStaff[2].id, receiverId: admin.id,          content: "Monthly report submitted! Let me know if you need any changes.", read: true },
      { senderId: admin.id,           receiverId: createdStaff[0].id, content: "Great work! I will review them this afternoon.", read: true },
      { senderId: createdStaff[3].id, receiverId: admin.id,          content: "Operations dashboard is ready for your review.", read: false },
      { senderId: createdStaff[4].id, receiverId: createdStaff[0].id, content: "Can you review my PR when you get a chance?", read: false },
      { senderId: createdStaff[6].id, receiverId: createdStaff[3].id, content: "The candidate shortlist for engineering is ready.", read: false },
    ],
    skipDuplicates: true,
  });

  // Attendance (last 10 working days for first 5 staff)
  const attendanceStatuses = ["PRESENT", "PRESENT", "PRESENT", "REMOTE", "PRESENT", "LATE", "PRESENT", "PRESENT", "HALF_DAY", "PRESENT"];
  for (let empIdx = 0; empIdx < 5; empIdx++) {
    const emp = createdStaff[empIdx].employee;
    if (!emp) continue;
    let workDay = 0;
    for (let ago = 1; workDay < 10; ago++) {
      const date = daysAgo(ago);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const status = attendanceStatuses[workDay % attendanceStatuses.length];
      const clockIn = (status === "PRESENT" || status === "REMOTE") ? clockAt(date, 9, empIdx * 3) :
                      status === "LATE" ? clockAt(date, 10, 15) :
                      status === "HALF_DAY" ? clockAt(date, 9, 0) : null;
      const clockOut = clockIn ? clockAt(date, status === "HALF_DAY" ? 13 : 17, empIdx * 5) : null;
      try {
        await prisma.attendance.create({
          data: { employeeId: emp.id, date, status, clockIn, clockOut, note: status === "REMOTE" ? "Working from home" : null },
        });
      } catch {}
      workDay++;
    }
  }

  // Leave requests
  const leaveData = [
    { empIdx: 1, type: "ANNUAL",  start: daysAhead(14), end: daysAhead(18), days: 5,  reason: "Family holiday",          status: "PENDING" },
    { empIdx: 2, type: "SICK",    start: daysAgo(5),    end: daysAgo(3),    days: 3,  reason: "Flu recovery",            status: "APPROVED" },
    { empIdx: 4, type: "ANNUAL",  start: daysAhead(30), end: daysAhead(34), days: 5,  reason: "Annual leave",            status: "PENDING" },
    { empIdx: 5, type: "UNPAID",  start: daysAgo(20),   end: daysAgo(18),   days: 3,  reason: "Personal matters",       status: "APPROVED" },
    { empIdx: 6, type: "ANNUAL",  start: daysAhead(7),  end: daysAhead(9),  days: 3,  reason: "Short break",            status: "APPROVED" },
    { empIdx: 7, type: "SICK",    start: daysAgo(2),    end: daysAgo(1),    days: 2,  reason: null,                      status: "APPROVED" },
    { empIdx: 8, type: "ANNUAL",  start: daysAhead(21), end: daysAhead(25), days: 5,  reason: "Scheduled vacation",     status: "PENDING" },
    { empIdx: 3, type: "PATERNITY", start: daysAgo(30), end: daysAgo(16),   days: 10, reason: "Paternity leave",        status: "APPROVED" },
  ];

  for (const l of leaveData) {
    const emp = createdStaff[l.empIdx]?.employee;
    if (!emp) continue;
    try {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          type: l.type,
          status: l.status,
          startDate: l.start,
          endDate: l.end,
          days: l.days,
          reason: l.reason,
          reviewedById: l.status !== "PENDING" ? admin.id : null,
          reviewedAt: l.status !== "PENDING" ? daysAgo(1) : null,
        },
      });
    } catch {}
  }

  // System settings - payroll disabled by default
  await prisma.systemSetting.upsert({
    where: { key: "payrollEnabled" },
    update: {},
    create: { key: "payrollEnabled", value: "false" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "payrollCurrency" },
    update: {},
    create: { key: "payrollCurrency", value: "USD" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "payrollPayDay" },
    update: {},
    create: { key: "payrollPayDay", value: "25" },
  });

  // Work history entries
  const workHistoryData = [
    { empIdx: 0, type: "PROMOTION",           title: "Promoted to Engineering Manager",  desc: "Recognised for outstanding technical leadership.", fromValue: "Senior Engineer", toValue: "Engineering Manager" },
    { empIdx: 1, type: "DEPARTMENT_TRANSFER", title: "Transferred to Design Team",       desc: "Moved from Marketing to lead the Design department.", fromValue: "Marketing", toValue: "Design" },
    { empIdx: 4, type: "ROLE_CHANGE",         title: "Role Updated to Software Engineer", desc: "Completed probation and confirmed as full-time.", fromValue: "Junior Engineer", toValue: "Software Engineer" },
    { empIdx: 2, type: "NOTE",                title: "Employee of the Month - February", desc: "Recognised for exceptional campaign performance.", fromValue: null, toValue: null },
  ];

  for (const wh of workHistoryData) {
    const emp = createdStaff[wh.empIdx]?.employee;
    if (!emp) continue;
    try {
      await prisma.workHistory.create({
        data: {
          employeeId: emp.id,
          type: wh.type,
          title: wh.title,
          description: wh.desc,
          fromValue: wh.fromValue,
          toValue: wh.toValue,
          recordedById: admin.id,
          occurredAt: daysAgo(Math.floor(Math.random() * 90) + 30),
        },
      });
    } catch {}
  }

  console.log("Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:   admin@staffos.com / Admin@123");
  console.log("  Manager: a.chen@staffos.com / Staff@123");
  console.log("  Staff:   (any other account) / Staff@123\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
