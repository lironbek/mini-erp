/**
 * Revenue Data Service
 *
 * Aggregates revenue data from Freshbooks invoices for dashboard analytics.
 * - Revenue by customer
 * - Revenue by product
 * - AR aging summary
 */

import { prisma } from "@/lib/prisma";
import {
  refreshTokens,
  fetchInvoices,
  type FreshbooksConfig,
  type FreshbooksTokens,
  type FreshbooksInvoice,
} from "@/lib/integrations/freshbooks";
import { type Prisma } from "@prisma/client";

async function getValidTokens(): Promise<FreshbooksTokens | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "freshbooks_tokens" },
  });
  if (!setting) return null;
  let tokens = setting.value as unknown as FreshbooksTokens;
  if (Date.now() > tokens.expiresAt - 60000) {
    const config: FreshbooksConfig = {
      clientId: process.env.FRESHBOOKS_CLIENT_ID || "",
      clientSecret: process.env.FRESHBOOKS_CLIENT_SECRET || "",
      redirectUri: process.env.FRESHBOOKS_REDIRECT_URI || "",
    };
    tokens = await refreshTokens(config, tokens.refreshToken);
    await prisma.systemSetting.update({
      where: { key: "freshbooks_tokens" },
      data: { value: tokens as unknown as Prisma.InputJsonValue },
    });
  }
  return tokens;
}

export type RevenueByCustomer = {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  invoiceCount: number;
  paidAmount: number;
  outstandingAmount: number;
};

export type RevenueByProduct = {
  productId: string;
  productName: string;
  totalRevenue: number;
  unitsSold: number;
  avgUnitPrice: number;
};

export type ARAgingSummary = {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinetyDays: number;
  totalOutstanding: number;
};

function getDaysDifference(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getRevenueByCustomer(
  dateRange?: { start: Date; end: Date }
): Promise<RevenueByCustomer[]> {
  const tokens = await getValidTokens();
  if (!tokens) return [];

  const invoices = await fetchInvoices(
    tokens,
    dateRange?.start
  );

  // Get client mappings
  const mappingSetting = await prisma.systemSetting.findUnique({
    where: { key: "freshbooks_client_mappings" },
  });
  const mappings = (mappingSetting?.value as Record<string, string>[]) || [];

  // Group by customer
  const customerMap = new Map<string, RevenueByCustomer>();

  for (const invoice of invoices) {
    if (dateRange?.end && new Date(invoice.createDate) > dateRange.end) continue;

    const mapping = mappings.find(
      (m) => String(m.freshbooksClientId) === String(invoice.customerId)
    );
    const customerId = mapping?.internalCustomerId || `fb-${invoice.customerId}`;
    const customerName = mapping?.customerName || `Freshbooks Client #${invoice.customerId}`;

    const existing = customerMap.get(customerId) || {
      customerId,
      customerName,
      totalRevenue: 0,
      invoiceCount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
    };

    const total = parseFloat(invoice.amount.amount);
    const outstanding = parseFloat(invoice.outstanding.amount);

    existing.totalRevenue += total;
    existing.invoiceCount++;
    existing.paidAmount += total - outstanding;
    existing.outstandingAmount += outstanding;

    customerMap.set(customerId, existing);
  }

  return Array.from(customerMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
}

export async function getRevenueByProduct(
  dateRange?: { start: Date; end: Date }
): Promise<RevenueByProduct[]> {
  const tokens = await getValidTokens();
  if (!tokens) return [];

  const invoices = await fetchInvoices(
    tokens,
    dateRange?.start
  );

  // Get item mappings
  const mappingSetting = await prisma.systemSetting.findUnique({
    where: { key: "freshbooks_item_mappings" },
  });
  const mappings = (mappingSetting?.value as Record<string, string>[]) || [];

  const productMap = new Map<string, RevenueByProduct>();

  for (const invoice of invoices) {
    if (dateRange?.end && new Date(invoice.createDate) > dateRange.end) continue;

    for (const line of invoice.lines) {
      const mapping = mappings.find((m) => m.freshbooksItemName === line.name);
      const productId = mapping?.internalProductId || `fb-item-${line.name}`;
      const productName = mapping?.productName || line.name;

      const existing = productMap.get(productId) || {
        productId,
        productName,
        totalRevenue: 0,
        unitsSold: 0,
        avgUnitPrice: 0,
      };

      existing.totalRevenue += parseFloat(line.amount.amount);
      existing.unitsSold += line.qty;
      existing.avgUnitPrice =
        existing.unitsSold > 0 ? existing.totalRevenue / existing.unitsSold : 0;

      productMap.set(productId, existing);
    }
  }

  return Array.from(productMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
}

export async function getARaging(): Promise<ARAgingSummary> {
  const tokens = await getValidTokens();
  if (!tokens)
    return {
      current: 0,
      thirtyDays: 0,
      sixtyDays: 0,
      ninetyDays: 0,
      overNinetyDays: 0,
      totalOutstanding: 0,
    };

  const invoices = await fetchInvoices(tokens);

  const summary: ARAgingSummary = {
    current: 0,
    thirtyDays: 0,
    sixtyDays: 0,
    ninetyDays: 0,
    overNinetyDays: 0,
    totalOutstanding: 0,
  };

  for (const invoice of invoices) {
    const outstanding = parseFloat(invoice.outstanding.amount);
    if (outstanding <= 0) continue;

    summary.totalOutstanding += outstanding;
    const daysOld = getDaysDifference(invoice.dueDate);

    if (daysOld <= 0) {
      summary.current += outstanding;
    } else if (daysOld <= 30) {
      summary.thirtyDays += outstanding;
    } else if (daysOld <= 60) {
      summary.sixtyDays += outstanding;
    } else if (daysOld <= 90) {
      summary.ninetyDays += outstanding;
    } else {
      summary.overNinetyDays += outstanding;
    }
  }

  return summary;
}

export async function cacheRevenueData(invoices: FreshbooksInvoice[]): Promise<void> {
  const summary = {
    lastUpdated: new Date().toISOString(),
    invoiceCount: invoices.length,
    totalRevenue: invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.amount.amount),
      0
    ),
    totalOutstanding: invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.outstanding.amount),
      0
    ),
  };

  await prisma.systemSetting.upsert({
    where: { key: "freshbooks_revenue_cache" },
    create: {
      key: "freshbooks_revenue_cache",
      value: summary as unknown as Prisma.InputJsonValue,
      description: "Cached Freshbooks revenue summary",
    },
    update: {
      value: summary as unknown as Prisma.InputJsonValue,
    },
  });
}
