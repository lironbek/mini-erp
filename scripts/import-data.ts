/**
 * Data Import Script
 *
 * Usage:
 *   npx tsx scripts/import-data.ts --type customers --file data/customers.csv [--dry-run]
 *   npx tsx scripts/import-data.ts --type products --file data/products.csv [--dry-run]
 *   npx tsx scripts/import-data.ts --type materials --file data/materials.csv [--dry-run]
 *   npx tsx scripts/import-data.ts --type suppliers --file data/suppliers.csv [--dry-run]
 *   npx tsx scripts/import-data.ts --type inventory --file data/inventory.csv [--dry-run]
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { parse } from "path";

const prisma = new PrismaClient();

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] || ""));
    return row;
  });
}

async function importCustomers(rows: Record<string, string>[], dryRun: boolean) {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name) {
      errors.push(`Row ${processed + skipped + 1}: Missing name`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.customer.create({
        data: {
          name: { en: row.name, he: row.name_he || row.name },
          email: row.email || undefined,
          phone: row.phone || undefined,
          contactName: row.contact || undefined,
          deliveryAddress: row.address || undefined,
          paymentTerms: parseInt(row.payment_terms || "30"),
        },
      });
    }
    processed++;
  }

  return { processed, skipped, errors };
}

async function importProducts(rows: Record<string, string>[], dryRun: boolean) {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.sku || !row.name) {
      errors.push(`Row ${processed + skipped + 1}: Missing sku or name`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.product.create({
        data: {
          sku: row.sku,
          name: { en: row.name, he: row.name_he || row.name },
          category: row.category || undefined,
          productionLine: (row.line as "BAKERY" | "SALADS" | "FROZEN") || "BAKERY",
          shelfLifeDays: parseInt(row.shelf_life || "7"),
          sellingPrice: row.selling_price ? parseFloat(row.selling_price) : undefined,
          costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
          minStockLevel: parseFloat(row.min_stock || "0"),
        },
      });
    }
    processed++;
  }

  return { processed, skipped, errors };
}

async function importMaterials(rows: Record<string, string>[], dryRun: boolean) {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.sku || !row.name) {
      errors.push(`Row ${processed + skipped + 1}: Missing sku or name`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.rawMaterial.create({
        data: {
          sku: row.sku,
          name: { en: row.name, he: row.name_he || row.name },
          category: row.category || undefined,
          unitOfMeasure: (row.unit as "KG" | "G" | "LITER" | "PCS") || "KG",
          minStockLevel: parseFloat(row.min_stock || "0"),
          reorderPoint: row.reorder_point ? parseFloat(row.reorder_point) : undefined,
          lastPurchasePrice: row.price ? parseFloat(row.price) : undefined,
          leadTimeDays: parseInt(row.lead_time || "7"),
        },
      });
    }
    processed++;
  }

  return { processed, skipped, errors };
}

async function importSuppliers(rows: Record<string, string>[], dryRun: boolean) {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name) {
      errors.push(`Row ${processed + skipped + 1}: Missing name`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.supplier.create({
        data: {
          name: { en: row.name },
          email: row.email || undefined,
          phone: row.phone || undefined,
          contactName: row.contact || undefined,
          address: row.address || undefined,
          paymentTerms: parseInt(row.payment_terms || "30"),
          leadTimeDays: parseInt(row.lead_time || "3"),
        },
      });
    }
    processed++;
  }

  return { processed, skipped, errors };
}

async function importInventory(rows: Record<string, string>[], dryRun: boolean) {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.sku || !row.quantity) {
      errors.push(`Row ${processed + skipped + 1}: Missing sku or quantity`);
      skipped++;
      continue;
    }

    // Try raw material first, then product
    const rm = await prisma.rawMaterial.findUnique({ where: { sku: row.sku } });
    const prod = rm ? null : await prisma.product.findUnique({ where: { sku: row.sku } });

    if (!rm && !prod) {
      errors.push(`Row ${processed + skipped + 1}: SKU ${row.sku} not found`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.inventoryStock.upsert({
        where: {
          itemType_rawMaterialId_productId: {
            itemType: rm ? "RAW_MATERIAL" : "FINISHED_GOOD",
            rawMaterialId: rm?.id ?? "",
            productId: prod?.id ?? "",
          },
        },
        create: {
          itemType: rm ? "RAW_MATERIAL" : "FINISHED_GOOD",
          rawMaterialId: rm?.id ?? undefined,
          productId: prod?.id ?? undefined,
          quantityOnHand: parseFloat(row.quantity),
        },
        update: {
          quantityOnHand: parseFloat(row.quantity),
        },
      });
    }
    processed++;
  }

  return { processed, skipped, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const typeIdx = args.indexOf("--type");
  const fileIdx = args.indexOf("--file");
  const dryRun = args.includes("--dry-run");

  if (typeIdx === -1 || fileIdx === -1) {
    console.log("Usage: npx tsx scripts/import-data.ts --type <type> --file <path> [--dry-run]");
    console.log("Types: customers, products, materials, suppliers, inventory");
    process.exit(1);
  }

  const type = args[typeIdx + 1];
  const filePath = args[fileIdx + 1];

  console.log(`\n📦 Importing ${type} from ${parse(filePath).base}${dryRun ? " [DRY RUN]" : ""}\n`);

  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  console.log(`Found ${rows.length} rows\n`);

  let result: { processed: number; skipped: number; errors: string[] };

  switch (type) {
    case "customers":
      result = await importCustomers(rows, dryRun);
      break;
    case "products":
      result = await importProducts(rows, dryRun);
      break;
    case "materials":
      result = await importMaterials(rows, dryRun);
      break;
    case "suppliers":
      result = await importSuppliers(rows, dryRun);
      break;
    case "inventory":
      result = await importInventory(rows, dryRun);
      break;
    default:
      console.error(`Unknown type: ${type}`);
      process.exit(1);
  }

  console.log(`✅ Processed: ${result.processed}`);
  console.log(`⏭️  Skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }
  if (dryRun) {
    console.log(`\n⚠️  DRY RUN - No data was actually imported`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
