const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Departments
  const depts = await Promise.all([
    prisma.department.upsert({ where: { name: "Engineering" }, update: {}, create: { name: "Engineering", description: "Software & infrastructure" } }),
    prisma.department.upsert({ where: { name: "Design" }, update: {}, create: { name: "Design", description: "UI/UX & brand" } }),
    prisma.department.upsert({ where: { name: "Marketing" }, update: {}, create: { name: "Marketing", description: "Growth & communications" } }),
    prisma.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance", description: "Accounting & budgets" } }),
    prisma.department.upsert({ where: { name: "HR" }, update: {}, create: { name: "HR", description: "People & culture" } }),
    prisma.department.upsert({ where: { name: "Operations" }, update: {}, create: { name: "Operations", description: "Business operations" } }),
    prisma.department.upsert({ where: { name: "Sales" }, update: {}, create: { name: "Sales", description: "Revenue & partnerships" } }),
  ]);

  const deptMap = Object.fromEntries(depts.map((d) => [d.name, d]));

  // Admin user
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@staffos.com" },
    update: {},
    create: {
      email: "admin@staffos.com",
      password: adminPassword,
      name: "Super Admin",
      role: "ADMIN",
      employee: {
        create: {
          jobTitle: "System Administrator",
          departmentId: deptMap["Operations"].id,
          status: "ACTIVE",
          joinDate: new Date("2020-01-01"),
        },
      },
    },
    include: { employee: true },
  });

  // Staff users
  const staffData = [
    { email: "a.chen@staffos.com", name: "Alexandra Chen", role: "MANAGER", dept: "Engineering", title: "Engineering Manager" },
    { email: "m.williams@staffos.com", name: "Marcus Williams", role: "STAFF", dept: "Design", title: "Senior Designer" },
    { email: "p.patel@staffos.com", name: "Priya Patel", role: "STAFF", dept: "Marketing", title: "Marketing Specialist" },
    { email: "j.okafor@staffos.com", name: "James Okafor", role: "MANAGER", dept: "Operations", title: "Operations Manager" },
    { email: "s.martinez@staffos.com", name: "Sofia Martinez", role: "STAFF", dept: "Engineering", title: "Software Engineer" },
    { email: "d.kim@staffos.com", name: "Daniel Kim", role: "STAFF", dept: "Finance", title: "Financial Analyst" },
    { email: "r.thompson@staffos.com", name: "Rachel Thompson", role: "STAFF", dept: "HR", title: "HR Coordinator" },
    { email: "a.hassan@staffos.com", name: "Ahmed Hassan", role: "MANAGER", dept: "Sales", title: "Sales Manager" },
  ];

  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ON_LEAVE", "ACTIVE", "ACTIVE", "INACTIVE", "ACTIVE"];
  const staffPass = await bcrypt.hash("Staff@123", 12);
  const createdStaff = [];

  for (let i = 0; i < staffData.length; i++) {
    const s = staffData[i];
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: staffPass,
        name: s.name,
        role: s.role,
        employee: {
          create: {
            jobTitle: s.title,
            departmentId: deptMap[s.dept].id,
            status: statuses[i],
            joinDate: new Date(`202${i % 3}-0${(i % 9) + 1}-01`),
          },
        },
      },
      include: { employee: true },
    });
    createdStaff.push(user);
  }

  // Tasks
  const allEmployees = [admin, ...createdStaff];
  const taskData = [
    { title: "Q4 Performance Review Documentation", desc: "Compile and review all Q4 performance data for engineering team.", priority: "HIGH", status: "IN_PROGRESS", dept: "Engineering", daysAhead: 7 },
    { title: "Redesign Onboarding Flow", desc: "Revamp the user onboarding experience based on latest UX research.", priority: "HIGH", status: "PENDING", dept: "Design", daysAhead: 14 },
    { title: "Monthly Marketing Report", desc: "Prepare the monthly marketing analytics and campaign performance report.", priority: "MEDIUM", status: "COMPLETED", dept: "Marketing", daysAhead: -2 },
    { title: "Update Employee Handbook", desc: "Incorporate 2026 policy updates into the employee handbook.", priority: "LOW", status: "PENDING", dept: "HR", daysAhead: 21 },
    { title: "Budget Reconciliation Q1", desc: "Reconcile all Q1 transactions and prepare summary for CFO review.", priority: "HIGH", status: "IN_PROGRESS", dept: "Finance", daysAhead: 4 },
    { title: "Sales Pipeline Analysis", desc: "Analyze current sales pipeline and identify key opportunities.", priority: "MEDIUM", status: "IN_PROGRESS", dept: "Sales", daysAhead: 9 },
    { title: "Server Infrastructure Audit", desc: "Conduct full audit of cloud infrastructure for cost optimisation.", priority: "HIGH", status: "COMPLETED", dept: "Engineering", daysAhead: -5 },
    { title: "Team Building Event Planning", desc: "Organise Q2 team building activities and book venues.", priority: "LOW", status: "PENDING", dept: "Operations", daysAhead: 32 },
  ];

  const adminEmployee = admin.employee;

  for (const t of taskData) {
    const dept = deptMap[t.dept];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + t.daysAhead);

    const assigneeUser = createdStaff.find((u) => {
      const emp = u.employee;
      return emp && emp.departmentId === dept.id;
    });

    await prisma.task.create({
      data: {
        title: t.title,
        description: t.desc,
        priority: t.priority,
        status: t.status,
        departmentId: dept.id,
        deadline,
        completedAt: t.status === "COMPLETED" ? new Date() : null,
        createdById: adminEmployee.id,
        assigneeId: assigneeUser?.employee?.id ?? adminEmployee.id,
      },
    });
  }

  // Seed some messages
  await prisma.message.createMany({
    data: [
      { senderId: createdStaff[0].id, receiverId: admin.id, content: "The Q4 review docs are almost ready — just need your sign-off.", read: false },
      { senderId: createdStaff[1].id, receiverId: admin.id, content: "Shared the new wireframes in the design folder.", read: false },
      { senderId: createdStaff[2].id, receiverId: admin.id, content: "Monthly report submitted! Let me know if you need any changes.", read: true },
      { senderId: admin.id, receiverId: createdStaff[0].id, content: "Great work! I will review them this afternoon.", read: true },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed complete!");
  console.log("\n📧 Login credentials:");
  console.log("   Admin:   admin@staffos.com  /  Admin@123");
  console.log("   Staff:   a.chen@staffos.com /  Staff@123");
  console.log("   (same password for all staff accounts)\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
