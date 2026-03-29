# Payroll

Payroll is an optional feature in StaffOS. It is hidden by default and must be explicitly enabled by an Admin before it becomes visible to anyone.

---

## Enabling Payroll

1. Log in as an Admin
2. Navigate to Settings
3. Click the System tab
4. Toggle the Payroll Integration switch on
5. Click Save Settings if prompted, or the toggle saves automatically
6. Reload the page to see the Payroll link appear in the navigation sidebar

When payroll is enabled, it becomes visible in the navigation for all roles including Staff. When it is disabled again, the link disappears for everyone on their next page load.

The setting is stored in the SystemSetting table under the key `payrollEnabled` with a value of `"true"` or `"false"`.

---

## Configuration

When payroll is enabled, Admins can configure it from the Payroll page itself:

**Payroll Provider**: The name of the external payroll service you use, such as Gusto, ADP, Xero, or any other system. This is a free text field used for display purposes.

**Currency**: The currency used for displaying payroll amounts. Options include USD, EUR, GBP, CAD, AUD, JPY, CHF, INR, SGD, and AED.

**Pay Day**: The day of the month on which salary is paid, entered as a number from 1 to 31. The application calculates and displays the next upcoming pay date based on this value.

---

## Next Pay Date Calculation

The next pay date is calculated on the client each time the Payroll page loads. It takes the configured pay day, checks whether that day has already passed in the current month, and if so returns the same day next month. The result is displayed in a card on the page.

---

## What Payroll Does Not Do Yet

The current implementation stores configuration and controls visibility. It does not yet:
- Connect to external payroll APIs
- Sync attendance data to the payroll provider automatically
- Generate or display pay slips
- Calculate salaries or deductions

The payroll page shows placeholder cards for these capabilities as a reference for future integration. The intent is that attendance records and leave approvals would feed into an external payroll provider rather than StaffOS performing payroll calculations itself.

---

## Disabling Payroll

An Admin can disable payroll at any time by returning to Settings and toggling the Payroll Integration switch off. All configuration values are preserved in the database so they do not need to be re-entered if payroll is enabled again later.
