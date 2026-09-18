import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayFlow — Payroll Onboarding & Reconciliation Ops",
  description:
    "Operations dashboard for B2B payroll onboarding pipelines, SLA tracking, pre-payroll validation, and gross-to-net reconciliation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
