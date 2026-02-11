import { describe, it, expect } from "vitest";

// Date formatting for all locales
function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number, locale: string, currency = "SGD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

function calculateExpiryDate(productionDate: Date, shelfLifeDays: number): Date {
  const expiry = new Date(productionDate);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry;
}

function isExpiringSoon(expiryDate: Date, thresholdDays = 2): boolean {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  const daysDiff = diff / (1000 * 60 * 60 * 24);
  return daysDiff >= 0 && daysDiff <= thresholdDays;
}

describe("Date Formatting", () => {
  const testDate = new Date(2025, 5, 15); // June 15, 2025

  it("should format English dates", () => {
    const result = formatDate(testDate, "en");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });

  it("should format Chinese dates", () => {
    const result = formatDate(testDate, "zh-CN");
    expect(result).toContain("2025");
  });

  it("should format Malay dates", () => {
    const result = formatDate(testDate, "ms");
    expect(result).toContain("2025");
  });
});

describe("Currency Formatting", () => {
  it("should format SGD correctly", () => {
    const result = formatCurrency(1234.56, "en", "SGD");
    expect(result).toContain("1,234.56");
  });

  it("should handle zero amounts", () => {
    const result = formatCurrency(0, "en", "SGD");
    expect(result).toContain("0");
  });

  it("should handle negative amounts", () => {
    const result = formatCurrency(-500, "en", "SGD");
    expect(result).toContain("500");
  });
});

describe("Shelf Life / Expiry", () => {
  it("should calculate expiry date correctly", () => {
    const production = new Date(2025, 0, 1);
    const expiry = calculateExpiryDate(production, 7);
    expect(expiry.getDate()).toBe(8);
  });

  it("should detect items expiring soon", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isExpiringSoon(tomorrow, 2)).toBe(true);
  });

  it("should not flag items with plenty of shelf life", () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 30);
    expect(isExpiringSoon(farFuture, 2)).toBe(false);
  });

  it("should not flag already expired items", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isExpiringSoon(yesterday, 2)).toBe(false);
  });
});
