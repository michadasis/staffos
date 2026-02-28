import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "StaffOS — Staff Management Platform",
  description: "Manage your team, tasks, and performance in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-bg text-text-main font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#111827", color: "#e2e8f0", border: "1px solid #1e2d45", fontSize: "13px" },
            success: { iconTheme: { primary: "#10b981", secondary: "#111827" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#111827" } },
          }}
        />
      </body>
    </html>
  );
}
