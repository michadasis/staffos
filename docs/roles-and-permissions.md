# Roles and Permissions

Every user in StaffOS has one of three roles assigned at registration. Roles control which pages appear in the navigation, which API endpoints accept requests, and what actions are available within each feature.

---

## Role Definitions

**Admin** is the highest level of access. Admins can manage all users, approve registrations, change system settings, view audit logs, create backups, and perform any action available to lower roles.

**Manager** has access to team management features such as creating tasks, viewing staff, approving leave, and logging attendance. Managers cannot access system settings, audit logs, or backup tools.

**Staff** is the default role. Staff members can view their own profile, submit leave requests, see their attendance records, send messages, and work on tasks assigned to them.

---

## Feature Access Matrix

| Feature | Admin | Manager | Staff |
|---|---|---|---|
| Dashboard | Full | Full | Full |
| Staff list and profiles | Full | Full | None |
| Create and assign tasks | Full | Full | Own |
| View tasks | Full | Full | Own |
| Log attendance | Full | Full | None |
| View attendance | Full | Full | Own |
| Submit leave requests | Full | Full | Full |
| Approve leave requests | Full | Full | None |
| View leave requests | Full | Full | Own |
| Direct messaging | Full | Full | Full |
| Performance reports | Full | Full | None |
| Reports and exports | Full | Full | None |
| Audit logs | Full | Full | None |
| Data backup | Full | None | None |
| Notification preferences | Full | Full | Full |
| Send announcements | Full | Full | None |
| System settings (payroll) | Full | None | None |
| Approve email changes | Full | None | None |
| Approve registrations | Full | Full | None |
| Payroll page (when enabled) | Full | Full | Full |

---

## Role Assignment

Roles are set at registration and can be changed by an admin from the Staff profile page. When a new user registers, the role defaults to Staff. Admins can promote users to Manager or Admin from the edit panel on the Staff page.

---

## Route Protection

Protection is applied at two levels.

**Layout level**: The dashboard layout checks the current route against the role requirements in the navigation config. If a user navigates to a route their role is not permitted to access, they are redirected to the dashboard.

**API level**: Every API route handler independently verifies the token and checks the role. A frontend bypass is not sufficient to access protected data. The backend always enforces its own checks.

---

## Payroll Visibility

The Payroll page is special. It is controlled by a system setting that only admins can toggle. When payroll is disabled, the page does not appear in the navigation for any role, including admins. When payroll is enabled, it appears for all roles. Admins can enable or disable it from Settings under the System tab.
