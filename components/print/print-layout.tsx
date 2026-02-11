"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type PrintLayoutProps = {
  title: string;
  children: ReactNode;
  preparedBy?: string;
  date?: string;
};

export function PrintLayout({ title, children, preparedBy, date }: PrintLayoutProps) {
  const printDate = date || new Date().toLocaleDateString();

  return (
    <div>
      {/* Print Button - hidden in print */}
      <div className="print:hidden mb-4 flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer className="me-1 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Print Content */}
      <div className="print:block">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Esemby Concept / Pita Bakery Singapore
            </p>
          </div>
          <div className="text-end text-sm">
            <p>Date: {printDate}</p>
            {preparedBy && <p>Prepared by: {preparedBy}</p>}
          </div>
        </div>

        {/* Body */}
        {children}

        {/* Footer - only visible in print */}
        <div className="hidden print:block mt-12 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <div>
              <p className="mb-8">Signature: _______________</p>
            </div>
            <div>
              <p className="mb-8">Approved by: _______________</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-400 mt-4">
            Mini ERP • Esemby Concept Pte Ltd • Printed: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
