import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini ERP - Pita Bakery",
  description: "Mini ERP System for Esemby Concept / Pita Bakery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
