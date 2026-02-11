import { describe, it, expect } from "vitest";

// BOM explosion calculation
type BomItem = {
  rawMaterialId: string;
  quantity: number; // per batch
  wastePercentage: number;
};

type Bom = {
  items: BomItem[];
  standardBatchSize: number;
  yieldPercentage: number;
};

function calculateMaterialNeeds(
  bom: Bom,
  requiredOutput: number
): { materialId: string; quantity: number }[] {
  const batchesNeeded = requiredOutput / (bom.standardBatchSize * (bom.yieldPercentage / 100));

  return bom.items.map((item) => ({
    materialId: item.rawMaterialId,
    quantity: item.quantity * batchesNeeded * (1 + item.wastePercentage / 100),
  }));
}

describe("BOM Explosion Calculation", () => {
  const sampleBom: Bom = {
    standardBatchSize: 100,
    yieldPercentage: 95,
    items: [
      { rawMaterialId: "flour", quantity: 50, wastePercentage: 2 },
      { rawMaterialId: "water", quantity: 30, wastePercentage: 0 },
      { rawMaterialId: "salt", quantity: 1, wastePercentage: 5 },
    ],
  };

  it("should calculate materials for a single batch", () => {
    const needs = calculateMaterialNeeds(sampleBom, 95); // 1 batch at 95% yield
    expect(needs).toHaveLength(3);
    expect(needs[0].materialId).toBe("flour");
    expect(needs[0].quantity).toBeCloseTo(51, 0); // 50 * 1 * 1.02
  });

  it("should scale materials linearly with output", () => {
    const needs1 = calculateMaterialNeeds(sampleBom, 95);
    const needs2 = calculateMaterialNeeds(sampleBom, 190);
    expect(needs2[0].quantity).toBeCloseTo(needs1[0].quantity * 2, 0);
  });

  it("should account for yield percentage", () => {
    const needs = calculateMaterialNeeds(sampleBom, 100);
    // Need more than 1 batch to produce 100 units at 95% yield
    const batchesNeeded = 100 / (100 * 0.95);
    expect(needs[0].quantity).toBeCloseTo(50 * batchesNeeded * 1.02, 1);
  });

  it("should account for waste percentage", () => {
    const needs = calculateMaterialNeeds(sampleBom, 95);
    // Salt has 5% waste
    const saltNeed = needs.find((n) => n.materialId === "salt")!;
    expect(saltNeed.quantity).toBeCloseTo(1 * 1.05, 2);
  });

  it("should handle zero waste correctly", () => {
    const needs = calculateMaterialNeeds(sampleBom, 95);
    const waterNeed = needs.find((n) => n.materialId === "water")!;
    expect(waterNeed.quantity).toBeCloseTo(30, 0);
  });
});
