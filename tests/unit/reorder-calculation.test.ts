import { describe, it, expect } from "vitest";

type Material = {
  id: string;
  sku: string;
  minStockLevel: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  leadTimeDays: number;
  currentStock: number;
  avgDailyUsage: number;
};

type ReorderSuggestion = {
  materialId: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  daysUntilStockout: number;
  urgency: "critical" | "warning" | "normal";
};

function calculateReorderSuggestions(
  materials: Material[]
): ReorderSuggestion[] {
  return materials
    .filter((m) => {
      const rp = m.reorderPoint ?? m.minStockLevel * 1.5;
      return m.currentStock <= rp;
    })
    .map((m) => {
      const reorderPoint = m.reorderPoint ?? m.minStockLevel * 1.5;
      const suggestedQuantity =
        m.reorderQuantity ??
        Math.max(m.avgDailyUsage * m.leadTimeDays * 2, m.minStockLevel * 2);
      const daysUntilStockout =
        m.avgDailyUsage > 0 ? m.currentStock / m.avgDailyUsage : 999;

      return {
        materialId: m.id,
        sku: m.sku,
        currentStock: m.currentStock,
        reorderPoint,
        suggestedQuantity,
        daysUntilStockout,
        urgency:
          m.currentStock <= m.minStockLevel
            ? "critical"
            : daysUntilStockout <= m.leadTimeDays
              ? "warning"
              : "normal",
      };
    })
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
}

describe("Auto-Reorder Calculation", () => {
  it("should flag materials below reorder point", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "FLOUR-001",
        minStockLevel: 100,
        reorderPoint: 150,
        reorderQuantity: 500,
        leadTimeDays: 3,
        currentStock: 120,
        avgDailyUsage: 40,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedQuantity).toBe(500);
  });

  it("should not flag materials above reorder point", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "FLOUR-001",
        minStockLevel: 100,
        reorderPoint: 150,
        reorderQuantity: 500,
        leadTimeDays: 3,
        currentStock: 200,
        avgDailyUsage: 40,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions).toHaveLength(0);
  });

  it("should mark critical when below min stock", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "FLOUR-001",
        minStockLevel: 100,
        reorderPoint: 150,
        reorderQuantity: 500,
        leadTimeDays: 3,
        currentStock: 50,
        avgDailyUsage: 40,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions[0].urgency).toBe("critical");
  });

  it("should calculate days until stockout", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "FLOUR-001",
        minStockLevel: 100,
        reorderPoint: 150,
        reorderQuantity: 500,
        leadTimeDays: 3,
        currentStock: 120,
        avgDailyUsage: 40,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions[0].daysUntilStockout).toBe(3); // 120 / 40
  });

  it("should use default reorder point when not set", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "SALT-001",
        minStockLevel: 10,
        reorderPoint: null,
        reorderQuantity: null,
        leadTimeDays: 5,
        currentStock: 12,
        avgDailyUsage: 2,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions).toHaveLength(1);
    // Default reorder point = minStockLevel * 1.5 = 15
    expect(suggestions[0].reorderPoint).toBe(15);
  });

  it("should sort by urgency (days until stockout)", () => {
    const materials: Material[] = [
      {
        id: "1",
        sku: "FLOUR-001",
        minStockLevel: 100,
        reorderPoint: 200,
        reorderQuantity: 500,
        leadTimeDays: 3,
        currentStock: 150,
        avgDailyUsage: 50,
      },
      {
        id: "2",
        sku: "SALT-001",
        minStockLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        leadTimeDays: 5,
        currentStock: 5,
        avgDailyUsage: 2,
      },
    ];

    const suggestions = calculateReorderSuggestions(materials);
    expect(suggestions[0].sku).toBe("SALT-001"); // 2.5 days
    expect(suggestions[1].sku).toBe("FLOUR-001"); // 3 days
  });
});
