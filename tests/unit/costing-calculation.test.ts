import { describe, it, expect } from "vitest";

type CostBreakdown = {
  directMaterials: number;
  directLabor: number;
  overhead: number;
  transport: number;
  totalCost: number;
  marginPerUnit: number;
  marginPercent: number;
};

type BomCostItem = {
  quantity: number; // per unit
  pricePerUnit: number;
};

function calculateProductCost(params: {
  bomItems: BomCostItem[];
  laborHours: number;
  hourlyRate: number;
  batchSize: number;
  overheadPercent: number;
  transportPerUnit: number;
  sellingPrice: number;
}): CostBreakdown {
  const directMaterials = params.bomItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
  const directLabor =
    (params.laborHours * params.hourlyRate) / params.batchSize;
  const overhead = (directMaterials + directLabor) * (params.overheadPercent / 100);
  const transport = params.transportPerUnit;
  const totalCost = directMaterials + directLabor + overhead + transport;
  const marginPerUnit = params.sellingPrice - totalCost;
  const marginPercent =
    params.sellingPrice > 0 ? (marginPerUnit / params.sellingPrice) * 100 : 0;

  return {
    directMaterials,
    directLabor,
    overhead,
    transport,
    totalCost,
    marginPerUnit,
    marginPercent,
  };
}

describe("Product Costing Calculation", () => {
  const sampleParams = {
    bomItems: [
      { quantity: 0.5, pricePerUnit: 2.0 }, // flour: 0.5kg @ $2/kg
      { quantity: 0.02, pricePerUnit: 5.0 }, // salt: 20g @ $5/kg
    ],
    laborHours: 2,
    hourlyRate: 15,
    batchSize: 100,
    overheadPercent: 20,
    transportPerUnit: 0.5,
    sellingPrice: 3.0,
  };

  it("should calculate direct materials correctly", () => {
    const result = calculateProductCost(sampleParams);
    expect(result.directMaterials).toBeCloseTo(1.1, 2); // 0.5*2.0 + 0.02*5.0
  });

  it("should calculate direct labor per unit", () => {
    const result = calculateProductCost(sampleParams);
    expect(result.directLabor).toBeCloseTo(0.3, 2); // 2*15/100
  });

  it("should calculate overhead allocation", () => {
    const result = calculateProductCost(sampleParams);
    // (1.1 + 0.3) * 0.20 = 0.28
    expect(result.overhead).toBeCloseTo(0.28, 2);
  });

  it("should calculate total cost", () => {
    const result = calculateProductCost(sampleParams);
    // 1.1 + 0.3 + 0.28 + 0.5 = 2.18
    expect(result.totalCost).toBeCloseTo(2.18, 2);
  });

  it("should calculate margin correctly", () => {
    const result = calculateProductCost(sampleParams);
    expect(result.marginPerUnit).toBeCloseTo(0.82, 2); // 3.0 - 2.18
    expect(result.marginPercent).toBeCloseTo(27.3, 0); // 0.82/3.0 * 100
  });

  it("should handle zero selling price", () => {
    const result = calculateProductCost({ ...sampleParams, sellingPrice: 0 });
    expect(result.marginPercent).toBe(0);
  });

  it("should handle zero overhead", () => {
    const result = calculateProductCost({ ...sampleParams, overheadPercent: 0 });
    expect(result.overhead).toBe(0);
    expect(result.totalCost).toBeCloseTo(1.9, 1); // 1.1 + 0.3 + 0 + 0.5
  });
});
