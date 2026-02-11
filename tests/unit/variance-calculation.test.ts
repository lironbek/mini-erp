import { describe, it, expect } from "vitest";

type VarianceResult = {
  materialId: string;
  expectedUsage: number;
  actualUsage: number;
  variance: number;
  variancePercent: number;
  costImpact: number;
};

function calculateVariance(
  expected: Map<string, number>,
  actual: Map<string, number>,
  prices: Map<string, number>
): VarianceResult[] {
  const allIds = new Set([...expected.keys(), ...actual.keys()]);

  return Array.from(allIds).map((id) => {
    const exp = expected.get(id) || 0;
    const act = actual.get(id) || 0;
    const variance = act - exp;
    const variancePercent = exp > 0 ? (variance / exp) * 100 : 0;
    const price = prices.get(id) || 0;

    return {
      materialId: id,
      expectedUsage: exp,
      actualUsage: act,
      variance,
      variancePercent,
      costImpact: variance * price,
    };
  });
}

describe("Material Variance Calculation", () => {
  it("should calculate positive variance (overuse)", () => {
    const expected = new Map([["flour", 100]]);
    const actual = new Map([["flour", 110]]);
    const prices = new Map([["flour", 2.5]]);

    const result = calculateVariance(expected, actual, prices);
    expect(result[0].variance).toBe(10);
    expect(result[0].variancePercent).toBe(10);
    expect(result[0].costImpact).toBe(25);
  });

  it("should calculate negative variance (underuse)", () => {
    const expected = new Map([["flour", 100]]);
    const actual = new Map([["flour", 90]]);
    const prices = new Map([["flour", 2.5]]);

    const result = calculateVariance(expected, actual, prices);
    expect(result[0].variance).toBe(-10);
    expect(result[0].variancePercent).toBe(-10);
    expect(result[0].costImpact).toBe(-25);
  });

  it("should handle zero expected usage", () => {
    const expected = new Map<string, number>();
    const actual = new Map([["flour", 50]]);
    const prices = new Map([["flour", 2.5]]);

    const result = calculateVariance(expected, actual, prices);
    expect(result[0].variance).toBe(50);
    expect(result[0].variancePercent).toBe(0); // Can't compute % with 0 expected
  });

  it("should handle multiple materials", () => {
    const expected = new Map([
      ["flour", 100],
      ["salt", 5],
    ]);
    const actual = new Map([
      ["flour", 105],
      ["salt", 6],
    ]);
    const prices = new Map([
      ["flour", 2.5],
      ["salt", 1.0],
    ]);

    const result = calculateVariance(expected, actual, prices);
    expect(result).toHaveLength(2);

    const totalCostImpact = result.reduce((sum, r) => sum + r.costImpact, 0);
    expect(totalCostImpact).toBe(5 * 2.5 + 1 * 1.0); // 13.5
  });

  it("should handle exact match (zero variance)", () => {
    const expected = new Map([["flour", 100]]);
    const actual = new Map([["flour", 100]]);
    const prices = new Map([["flour", 2.5]]);

    const result = calculateVariance(expected, actual, prices);
    expect(result[0].variance).toBe(0);
    expect(result[0].variancePercent).toBe(0);
    expect(result[0].costImpact).toBe(0);
  });
});
