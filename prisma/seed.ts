import { Prisma, PrismaClient, ProductionLine, UnitOfMeasure, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================================
  // USERS
  // ============================================================
  const passwordHash = await hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@pitabakery.sg" },
    update: {},
    create: {
      email: "admin@pitabakery.sg",
      passwordHash,
      name: "Admin User",
      role: UserRole.ADMIN,
      preferredLanguage: "en",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@pitabakery.sg" },
    update: {},
    create: {
      email: "manager@pitabakery.sg",
      passwordHash,
      name: "Sarah Manager",
      role: UserRole.MANAGER,
      preferredLanguage: "en",
    },
  });

  const production = await prisma.user.upsert({
    where: { email: "floor@pitabakery.sg" },
    update: {},
    create: {
      email: "floor@pitabakery.sg",
      passwordHash,
      name: "Ahmad Floor",
      role: UserRole.PRODUCTION,
      preferredLanguage: "ms",
    },
  });

  const lironHash = await hash("123456", 12);
  const liron = await prisma.user.upsert({
    where: { email: "lironbek88@gmail.com" },
    update: { passwordHash: lironHash, role: UserRole.ADMIN },
    create: {
      email: "lironbek88@gmail.com",
      passwordHash: lironHash,
      name: "Liron",
      role: UserRole.ADMIN,
      preferredLanguage: "he",
    },
  });

  console.log("✅ Users created");

  // ============================================================
  // SUPPLIERS
  // ============================================================
  const supplier1 = await prisma.supplier.create({
    data: {
      name: { en: "Singapore Flour Mills", he: "טחנות קמח סינגפור", "zh-CN": "新加坡面粉厂", ms: "Kilang Tepung Singapura" },
      shortName: "SFM",
      contactName: "Mr. Tan Wei",
      email: "orders@sgflourmills.com",
      phone: "+65 6789 0123",
      address: "10 Pioneer Road, Singapore 628434",
      country: "Singapore",
      paymentTerms: 30,
      currency: "SGD",
      deliveryDays: [1, 2, 3, 4, 5],
      deliveryTimeSlots: ["06:00-08:00", "14:00-16:00"],
      minOrderAmount: 200,
      leadTimeDays: 2,
      rating: 4.5,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: { en: "Asia Pacific Oils", he: "שמני אסיה פסיפיק", "zh-CN": "亚太油脂", ms: "Minyak Asia Pasifik" },
      shortName: "APO",
      contactName: "Ms. Chen Li",
      email: "sales@apaoils.com",
      phone: "+65 6234 5678",
      address: "25 Jurong Port Road, Singapore 619105",
      country: "Singapore",
      paymentTerms: 45,
      currency: "SGD",
      deliveryDays: [1, 3, 5],
      deliveryTimeSlots: ["08:00-10:00"],
      minOrderAmount: 500,
      leadTimeDays: 3,
      rating: 4.2,
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: { en: "Spice Island Trading", he: "סחר אי התבלינים", "zh-CN": "香料岛贸易", ms: "Perdagangan Pulau Rempah" },
      shortName: "SIT",
      contactName: "Mr. Kumar",
      email: "info@spiceisland.sg",
      phone: "+65 6345 6789",
      address: "8 Tuas South Ave 2, Singapore 637601",
      country: "Singapore",
      paymentTerms: 30,
      currency: "SGD",
      deliveryDays: [2, 4],
      deliveryTimeSlots: ["10:00-12:00"],
      minOrderAmount: 100,
      leadTimeDays: 5,
      rating: 4.0,
    },
  });

  console.log("✅ Suppliers created");

  // ============================================================
  // RAW MATERIALS
  // ============================================================
  const flour55 = await prisma.rawMaterial.create({
    data: {
      sku: "RM-FLR-001",
      name: { en: "Flour Type 55", he: "קמח סוג 55", "zh-CN": "55号面粉", ms: "Tepung Jenis 55" },
      category: "flour",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      reorderQuantity: 200,
      leadTimeDays: 2,
      primarySupplierId: supplier1.id,
      lastPurchasePrice: 1.20,
      averagePurchasePrice: 1.18,
      storageLocation: "dry_store",
      storageTempMin: 15,
      storageTempMax: 25,
    },
  });

  const flour00 = await prisma.rawMaterial.create({
    data: {
      sku: "RM-FLR-002",
      name: { en: "Flour Type 00", he: "קמח סוג 00", "zh-CN": "00号面粉", ms: "Tepung Jenis 00" },
      category: "flour",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 30,
      maxStockLevel: 300,
      reorderPoint: 60,
      reorderQuantity: 150,
      leadTimeDays: 2,
      primarySupplierId: supplier1.id,
      lastPurchasePrice: 1.50,
      averagePurchasePrice: 1.45,
      storageLocation: "dry_store",
    },
  });

  const oliveOil = await prisma.rawMaterial.create({
    data: {
      sku: "RM-OIL-001",
      name: { en: "Olive Oil Extra Virgin", he: "שמן זית כתית מעולה", "zh-CN": "特级初榨橄榄油", ms: "Minyak Zaitun Dara" },
      category: "oil",
      unitOfMeasure: UnitOfMeasure.LITER,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      reorderQuantity: 50,
      leadTimeDays: 3,
      primarySupplierId: supplier2.id,
      lastPurchasePrice: 8.50,
      averagePurchasePrice: 8.30,
      storageLocation: "dry_store",
    },
  });

  const vegetableOil = await prisma.rawMaterial.create({
    data: {
      sku: "RM-OIL-002",
      name: { en: "Vegetable Oil", he: "שמן צמחי", "zh-CN": "植物油", ms: "Minyak Sayuran" },
      category: "oil",
      unitOfMeasure: UnitOfMeasure.LITER,
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
      reorderQuantity: 100,
      leadTimeDays: 3,
      primarySupplierId: supplier2.id,
      lastPurchasePrice: 3.50,
      averagePurchasePrice: 3.40,
      storageLocation: "dry_store",
    },
  });

  const salt = await prisma.rawMaterial.create({
    data: {
      sku: "RM-SPC-001",
      name: { en: "Salt (Fine)", he: "מלח (דק)", "zh-CN": "细盐", ms: "Garam (Halus)" },
      category: "spice",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 5,
      maxStockLevel: 50,
      reorderPoint: 10,
      reorderQuantity: 25,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 0.80,
      averagePurchasePrice: 0.78,
      storageLocation: "dry_store",
    },
  });

  const yeast = await prisma.rawMaterial.create({
    data: {
      sku: "RM-BAK-001",
      name: { en: "Fresh Yeast", he: "שמרים טריים", "zh-CN": "鲜酵母", ms: "Yis Segar" },
      category: "baking",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 2,
      maxStockLevel: 20,
      reorderPoint: 5,
      reorderQuantity: 10,
      leadTimeDays: 2,
      primarySupplierId: supplier1.id,
      lastPurchasePrice: 4.00,
      averagePurchasePrice: 3.90,
      storageLocation: "chiller_1",
      storageTempMin: 2,
      storageTempMax: 8,
    },
  });

  const sugar = await prisma.rawMaterial.create({
    data: {
      sku: "RM-BAK-002",
      name: { en: "White Sugar", he: "סוכר לבן", "zh-CN": "白糖", ms: "Gula Putih" },
      category: "baking",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      reorderQuantity: 50,
      leadTimeDays: 3,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 1.10,
      averagePurchasePrice: 1.05,
      storageLocation: "dry_store",
    },
  });

  const tahiniRaw = await prisma.rawMaterial.create({
    data: {
      sku: "RM-PAS-001",
      name: { en: "Raw Tahini Paste", he: "טחינה גולמית", "zh-CN": "生芝麻酱", ms: "Pes Tahini Mentah" },
      category: "paste",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 15,
      maxStockLevel: 150,
      reorderPoint: 30,
      reorderQuantity: 60,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 6.00,
      averagePurchasePrice: 5.80,
      storageLocation: "dry_store",
    },
  });

  const chickpeas = await prisma.rawMaterial.create({
    data: {
      sku: "RM-LEG-001",
      name: { en: "Dried Chickpeas", he: "חומוס מיובש", "zh-CN": "干鹰嘴豆", ms: "Kacang Kuda Kering" },
      category: "legume",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
      reorderQuantity: 80,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 2.50,
      averagePurchasePrice: 2.40,
      storageLocation: "dry_store",
    },
  });

  const lemon = await prisma.rawMaterial.create({
    data: {
      sku: "RM-FRU-001",
      name: { en: "Lemon Juice Concentrate", he: "מיץ לימון מרוכז", "zh-CN": "浓缩柠檬汁", ms: "Pati Jus Lemon" },
      category: "fruit",
      unitOfMeasure: UnitOfMeasure.LITER,
      minStockLevel: 5,
      maxStockLevel: 50,
      reorderPoint: 10,
      reorderQuantity: 20,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 5.50,
      averagePurchasePrice: 5.30,
      storageLocation: "chiller_1",
      storageTempMin: 2,
      storageTempMax: 8,
    },
  });

  const garlic = await prisma.rawMaterial.create({
    data: {
      sku: "RM-SPC-002",
      name: { en: "Garlic Powder", he: "אבקת שום", "zh-CN": "大蒜粉", ms: "Serbuk Bawang Putih" },
      category: "spice",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 2,
      maxStockLevel: 20,
      reorderPoint: 5,
      reorderQuantity: 10,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 12.00,
      averagePurchasePrice: 11.50,
      storageLocation: "dry_store",
    },
  });

  const cumin = await prisma.rawMaterial.create({
    data: {
      sku: "RM-SPC-003",
      name: { en: "Cumin Powder", he: "כמון טחון", "zh-CN": "孜然粉", ms: "Serbuk Jintan" },
      category: "spice",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 1,
      maxStockLevel: 10,
      reorderPoint: 3,
      reorderQuantity: 5,
      leadTimeDays: 5,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 15.00,
      averagePurchasePrice: 14.50,
      storageLocation: "dry_store",
    },
  });

  const packagingBag = await prisma.rawMaterial.create({
    data: {
      sku: "RM-PKG-001",
      name: { en: "Packaging Bag 20pk", he: "שקית אריזה 20 יח", "zh-CN": "包装袋20只装", ms: "Beg Pembungkusan 20pk" },
      category: "packaging",
      unitOfMeasure: UnitOfMeasure.PCS,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
      reorderQuantity: 500,
      leadTimeDays: 7,
      primarySupplierId: supplier1.id,
      lastPurchasePrice: 0.15,
      averagePurchasePrice: 0.14,
      storageLocation: "dry_store",
    },
  });

  const packagingTub = await prisma.rawMaterial.create({
    data: {
      sku: "RM-PKG-002",
      name: { en: "Tub Container 1kg", he: "מיכל 1 ק\"ג", "zh-CN": "1公斤桶装容器", ms: "Bekas Tub 1kg" },
      category: "packaging",
      unitOfMeasure: UnitOfMeasure.PCS,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      reorderQuantity: 200,
      leadTimeDays: 7,
      primarySupplierId: supplier1.id,
      lastPurchasePrice: 0.30,
      averagePurchasePrice: 0.28,
      storageLocation: "dry_store",
    },
  });

  const eggplant = await prisma.rawMaterial.create({
    data: {
      sku: "RM-VEG-001",
      name: { en: "Eggplant (Fresh)", he: "חציל (טרי)", "zh-CN": "茄子(新鲜)", ms: "Terung (Segar)" },
      category: "vegetable",
      unitOfMeasure: UnitOfMeasure.KG,
      minStockLevel: 10,
      maxStockLevel: 50,
      reorderPoint: 15,
      reorderQuantity: 30,
      leadTimeDays: 1,
      primarySupplierId: supplier3.id,
      lastPurchasePrice: 3.00,
      averagePurchasePrice: 2.80,
      storageLocation: "chiller_1",
      storageTempMin: 8,
      storageTempMax: 12,
    },
  });

  console.log("✅ Raw materials created");

  // ============================================================
  // CUSTOMERS
  // ============================================================
  const customer1 = await prisma.customer.create({
    data: {
      name: { en: "Marina Bay Sands", he: "מרינה ביי סנדס", "zh-CN": "滨海湾金沙", ms: "Marina Bay Sands" },
      shortName: "MBS",
      contactName: "Mr. David Lim",
      email: "procurement@mbs.com.sg",
      phone: "+65 6688 8000",
      whatsappNumber: "+6566888001",
      deliveryAddress: "10 Bayfront Avenue, Singapore 018956",
      billingAddress: "10 Bayfront Avenue, Singapore 018956",
      defaultDeliverySlot: "06:00-08:00",
      orderCutoffTime: "18:00",
      paymentTerms: 30,
      creditLimit: 50000,
      currency: "SGD",
      tags: ["hotel", "premium", "daily"],
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: { en: "Raffles Hotel", he: "מלון רפלס", "zh-CN": "莱佛士酒店", ms: "Hotel Raffles" },
      shortName: "Raffles",
      contactName: "Ms. Jennifer Teo",
      email: "kitchen@raffles.sg",
      phone: "+65 6337 1886",
      whatsappNumber: "+6563371887",
      deliveryAddress: "1 Beach Road, Singapore 189673",
      billingAddress: "1 Beach Road, Singapore 189673",
      defaultDeliverySlot: "05:00-07:00",
      orderCutoffTime: "17:00",
      paymentTerms: 30,
      creditLimit: 40000,
      currency: "SGD",
      tags: ["hotel", "premium", "daily"],
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: { en: "Mandarin Oriental", he: "מנדרין אוריינטל", "zh-CN": "文华东方", ms: "Mandarin Oriental" },
      shortName: "Mandarin",
      contactName: "Chef Wong",
      email: "purchasing@mandarinoriental.sg",
      phone: "+65 6338 0066",
      deliveryAddress: "5 Raffles Ave, Marina Square, Singapore 039797",
      defaultDeliverySlot: "06:00-08:00",
      orderCutoffTime: "18:00",
      paymentTerms: 45,
      creditLimit: 35000,
      currency: "SGD",
      tags: ["hotel", "premium", "weekly"],
      externalSystem: "ariba",
      externalId: "MO-SG-001",
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: { en: "FairPrice Finest", he: "פייר פרייס פיינסט", "zh-CN": "职总平价精选", ms: "FairPrice Finest" },
      shortName: "FairPrice",
      contactName: "Mr. Lim Kee",
      email: "vendor@fairprice.com.sg",
      phone: "+65 6456 7890",
      deliveryAddress: "1 Joo Koon Circle, Singapore 629117",
      defaultDeliverySlot: "04:00-06:00",
      orderCutoffTime: "15:00",
      paymentTerms: 60,
      creditLimit: 100000,
      currency: "SGD",
      tags: ["retail", "chain", "weekly"],
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      name: { en: "Cedele Restaurant Group", he: "קבוצת מסעדות סדל", "zh-CN": "Cedele餐厅集团", ms: "Kumpulan Restoran Cedele" },
      shortName: "Cedele",
      contactName: "Ms. Anna Tan",
      email: "orders@cedele.com",
      phone: "+65 6221 3456",
      whatsappNumber: "+6562213457",
      deliveryAddress: "501 Orchard Road, Singapore 238880",
      defaultDeliverySlot: "07:00-09:00",
      orderCutoffTime: "18:00",
      paymentTerms: 30,
      creditLimit: 25000,
      currency: "SGD",
      tags: ["restaurant", "chain", "daily"],
    },
  });

  console.log("✅ Customers created");

  // ============================================================
  // PRODUCTS
  // ============================================================
  const pitaLarge = await prisma.product.create({
    data: {
      sku: "PT-001",
      name: { en: "Pita Bread Large", he: "פיתה גדולה", "zh-CN": "大皮塔饼", ms: "Roti Pita Besar" },
      description: { en: "Large pita bread, 25cm diameter", he: "פיתה גדולה, קוטר 25 ס\"מ" },
      category: "pita",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 20,
      packWeightKg: 2.0,
      shelfLifeDays: 10,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
      standardBatchSize: 100,
      productionLeadTimeHours: 4,
      sellingPrice: 0.80,
      costPrice: 0.35,
    },
  });

  const pitaSmall = await prisma.product.create({
    data: {
      sku: "PT-002",
      name: { en: "Pita Bread Small", he: "פיתה קטנה", "zh-CN": "小皮塔饼", ms: "Roti Pita Kecil" },
      description: { en: "Small pita bread, 15cm diameter" },
      category: "pita",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 20,
      packWeightKg: 1.2,
      shelfLifeDays: 10,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      standardBatchSize: 100,
      productionLeadTimeHours: 3,
      sellingPrice: 0.60,
      costPrice: 0.25,
    },
  });

  const pitaMedium = await prisma.product.create({
    data: {
      sku: "PT-003",
      name: { en: "Pita Bread Medium", he: "פיתה בינונית", "zh-CN": "中皮塔饼", ms: "Roti Pita Sederhana" },
      category: "pita",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 20,
      packWeightKg: 1.6,
      shelfLifeDays: 10,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      standardBatchSize: 100,
      sellingPrice: 0.70,
      costPrice: 0.30,
    },
  });

  const laffa = await prisma.product.create({
    data: {
      sku: "PT-004",
      name: { en: "Laffa Flatbread", he: "לאפה", "zh-CN": "拉法饼", ms: "Roti Laffa" },
      category: "flatbread",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 10,
      packWeightKg: 1.5,
      shelfLifeDays: 7,
      minStockLevel: 30,
      maxStockLevel: 300,
      reorderPoint: 60,
      standardBatchSize: 50,
      sellingPrice: 1.20,
      costPrice: 0.50,
    },
  });

  const falafelFrozen = await prisma.product.create({
    data: {
      sku: "PT-005",
      name: { en: "Falafel Frozen", he: "פלאפל קפוא", "zh-CN": "冷冻法拉费", ms: "Falafel Beku" },
      category: "frozen",
      productionLine: ProductionLine.FROZEN,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 50,
      packWeightKg: 2.5,
      shelfLifeDays: 30,
      minStockLevel: 200,
      maxStockLevel: 2000,
      reorderPoint: 400,
      standardBatchSize: 200,
      sellingPrice: 1.20,
      costPrice: 0.55,
    },
  });

  const hummus1kg = await prisma.product.create({
    data: {
      sku: "SL-001",
      name: { en: "Hummus 1kg", he: "חומוס 1 ק\"ג", "zh-CN": "鹰嘴豆泥1公斤", ms: "Hummus 1kg" },
      category: "salad",
      productionLine: ProductionLine.SALADS,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 1,
      packWeightKg: 1.0,
      shelfLifeDays: 10,
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
      standardBatchSize: 50,
      sellingPrice: 8.50,
      costPrice: 3.50,
    },
  });

  const tahini500g = await prisma.product.create({
    data: {
      sku: "SL-002",
      name: { en: "Tahini 500g", he: "טחינה 500 גרם", "zh-CN": "芝麻酱500克", ms: "Tahini 500g" },
      category: "salad",
      productionLine: ProductionLine.SALADS,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 1,
      packWeightKg: 0.5,
      shelfLifeDays: 30,
      minStockLevel: 30,
      maxStockLevel: 300,
      reorderPoint: 60,
      standardBatchSize: 50,
      sellingPrice: 5.50,
      costPrice: 2.20,
    },
  });

  const babaGhanoush = await prisma.product.create({
    data: {
      sku: "SL-003",
      name: { en: "Baba Ghanoush 1kg", he: "בבא גנוש 1 ק\"ג", "zh-CN": "茄泥酱1公斤", ms: "Baba Ghanoush 1kg" },
      category: "salad",
      productionLine: ProductionLine.SALADS,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 1,
      packWeightKg: 1.0,
      shelfLifeDays: 10,
      minStockLevel: 15,
      maxStockLevel: 150,
      reorderPoint: 30,
      standardBatchSize: 30,
      sellingPrice: 9.00,
      costPrice: 4.00,
    },
  });

  const pitaChips = await prisma.product.create({
    data: {
      sku: "PT-006",
      name: { en: "Pita Chips Sea Salt", he: "צ'יפס פיתה מלח ים", "zh-CN": "海盐皮塔饼片", ms: "Kerepek Pita Garam Laut" },
      category: "snack",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PACK,
      unitsPerPack: 24,
      packWeightKg: 0.15,
      shelfLifeDays: 30,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      standardBatchSize: 100,
      sellingPrice: 3.50,
      costPrice: 1.20,
    },
  });

  const zaatar = await prisma.product.create({
    data: {
      sku: "PT-007",
      name: { en: "Za'atar Manakish", he: "מנאקיש זעתר", "zh-CN": "百里香馅饼", ms: "Manakish Za'atar" },
      category: "flatbread",
      productionLine: ProductionLine.BAKERY,
      unitOfMeasure: UnitOfMeasure.PCS,
      unitsPerPack: 10,
      packWeightKg: 1.0,
      shelfLifeDays: 7,
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
      standardBatchSize: 50,
      sellingPrice: 1.50,
      costPrice: 0.60,
    },
  });

  console.log("✅ Products created");

  // ============================================================
  // BILL OF MATERIALS (BOM)
  // ============================================================

  // BOM for Pita Large
  const bomPitaLarge = await prisma.bom.create({
    data: {
      productId: pitaLarge.id,
      version: 1,
      name: { en: "Pita Large Standard", he: "פיתה גדולה סטנדרטית" },
      isActive: true,
      yieldPercentage: 95,
      standardBatchSize: 100,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: flour55.id, quantity: 2.5, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 1 },
          { rawMaterialId: oliveOil.id, quantity: 0.2, unit: UnitOfMeasure.LITER, wastePercentage: 2, sortOrder: 2 },
          { rawMaterialId: salt.id, quantity: 0.05, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: yeast.id, quantity: 0.03, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 4 },
          { rawMaterialId: sugar.id, quantity: 0.02, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 5 },
          { rawMaterialId: packagingBag.id, quantity: 5, unit: UnitOfMeasure.PCS, wastePercentage: 3, sortOrder: 6 },
        ],
      },
    },
  });

  // BOM for Pita Small
  await prisma.bom.create({
    data: {
      productId: pitaSmall.id,
      version: 1,
      name: { en: "Pita Small Standard" },
      isActive: true,
      yieldPercentage: 95,
      standardBatchSize: 100,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: flour55.id, quantity: 1.5, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 1 },
          { rawMaterialId: oliveOil.id, quantity: 0.12, unit: UnitOfMeasure.LITER, wastePercentage: 2, sortOrder: 2 },
          { rawMaterialId: salt.id, quantity: 0.03, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: yeast.id, quantity: 0.02, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 4 },
          { rawMaterialId: sugar.id, quantity: 0.015, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 5 },
          { rawMaterialId: packagingBag.id, quantity: 5, unit: UnitOfMeasure.PCS, wastePercentage: 3, sortOrder: 6 },
        ],
      },
    },
  });

  // BOM for Hummus
  await prisma.bom.create({
    data: {
      productId: hummus1kg.id,
      version: 1,
      name: { en: "Hummus Standard" },
      isActive: true,
      yieldPercentage: 92,
      standardBatchSize: 50,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: chickpeas.id, quantity: 15, unit: UnitOfMeasure.KG, wastePercentage: 2, sortOrder: 1 },
          { rawMaterialId: tahiniRaw.id, quantity: 8, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 2 },
          { rawMaterialId: lemon.id, quantity: 1.5, unit: UnitOfMeasure.LITER, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: garlic.id, quantity: 0.3, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 4 },
          { rawMaterialId: oliveOil.id, quantity: 2, unit: UnitOfMeasure.LITER, wastePercentage: 1, sortOrder: 5 },
          { rawMaterialId: salt.id, quantity: 0.4, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 6 },
          { rawMaterialId: cumin.id, quantity: 0.1, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 7 },
          { rawMaterialId: packagingTub.id, quantity: 50, unit: UnitOfMeasure.PCS, wastePercentage: 2, sortOrder: 8 },
        ],
      },
    },
  });

  // BOM for Tahini
  await prisma.bom.create({
    data: {
      productId: tahini500g.id,
      version: 1,
      name: { en: "Tahini Standard" },
      isActive: true,
      yieldPercentage: 95,
      standardBatchSize: 50,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: tahiniRaw.id, quantity: 20, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 1 },
          { rawMaterialId: lemon.id, quantity: 1, unit: UnitOfMeasure.LITER, wastePercentage: 0, sortOrder: 2 },
          { rawMaterialId: salt.id, quantity: 0.2, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: garlic.id, quantity: 0.15, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 4 },
          { rawMaterialId: packagingTub.id, quantity: 50, unit: UnitOfMeasure.PCS, wastePercentage: 2, sortOrder: 5 },
        ],
      },
    },
  });

  // BOM for Baba Ghanoush
  await prisma.bom.create({
    data: {
      productId: babaGhanoush.id,
      version: 1,
      name: { en: "Baba Ghanoush Standard" },
      isActive: true,
      yieldPercentage: 90,
      standardBatchSize: 30,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: eggplant.id, quantity: 15, unit: UnitOfMeasure.KG, wastePercentage: 10, sortOrder: 1 },
          { rawMaterialId: tahiniRaw.id, quantity: 5, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 2 },
          { rawMaterialId: lemon.id, quantity: 0.5, unit: UnitOfMeasure.LITER, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: garlic.id, quantity: 0.15, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 4 },
          { rawMaterialId: oliveOil.id, quantity: 0.5, unit: UnitOfMeasure.LITER, wastePercentage: 1, sortOrder: 5 },
          { rawMaterialId: salt.id, quantity: 0.15, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 6 },
          { rawMaterialId: packagingTub.id, quantity: 30, unit: UnitOfMeasure.PCS, wastePercentage: 2, sortOrder: 7 },
        ],
      },
    },
  });

  // BOM for Falafel
  await prisma.bom.create({
    data: {
      productId: falafelFrozen.id,
      version: 1,
      name: { en: "Falafel Standard" },
      isActive: true,
      yieldPercentage: 93,
      standardBatchSize: 200,
      batchUnit: UnitOfMeasure.PCS,
      items: {
        create: [
          { rawMaterialId: chickpeas.id, quantity: 10, unit: UnitOfMeasure.KG, wastePercentage: 2, sortOrder: 1 },
          { rawMaterialId: garlic.id, quantity: 0.2, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 2 },
          { rawMaterialId: cumin.id, quantity: 0.15, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 3 },
          { rawMaterialId: flour55.id, quantity: 0.5, unit: UnitOfMeasure.KG, wastePercentage: 1, sortOrder: 4 },
          { rawMaterialId: salt.id, quantity: 0.15, unit: UnitOfMeasure.KG, wastePercentage: 0, sortOrder: 5 },
          { rawMaterialId: vegetableOil.id, quantity: 3, unit: UnitOfMeasure.LITER, wastePercentage: 5, sortOrder: 6 },
        ],
      },
    },
  });

  console.log("✅ BOMs created");

  // ============================================================
  // SYSTEM SETTINGS
  // ============================================================
  const settings = [
    { key: "order_cutoff_default", value: "18:00", description: "Default order cutoff time (day before delivery)" },
    { key: "production_lock_hours", value: 6, description: "Hours before delivery to lock orders" },
    { key: "low_stock_alert_enabled", value: true, description: "Enable low stock email/push alerts" },
    { key: "daily_summary_time", value: "06:00", description: "Time to send daily order summary" },
    { key: "supported_languages", value: ["en", "he", "zh-CN", "ms"], description: "Enabled UI languages" },
    { key: "default_language", value: "en", description: "Default system language" },
    { key: "timezone", value: "Asia/Singapore", description: "System timezone" },
    { key: "currency", value: "SGD", description: "Default currency" },
    { key: "whatsapp_reminder_time", value: "15:00", description: "Time to send WhatsApp order reminders" },
    { key: "inventory_count_frequency", value: "weekly", description: "How often to prompt stock counts" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value as Prisma.InputJsonValue,
        description: setting.description,
      },
    });
  }

  console.log("✅ System settings created");

  // ============================================================
  // INVENTORY STOCK (initial balances)
  // ============================================================
  const rawMaterials = [flour55, flour00, oliveOil, vegetableOil, salt, yeast, sugar, tahiniRaw, chickpeas, lemon, garlic, cumin, packagingBag, packagingTub, eggplant];
  const initialStockRM = [120, 80, 25, 50, 15, 5, 30, 45, 60, 12, 3, 2, 500, 200, 20];

  for (let i = 0; i < rawMaterials.length; i++) {
    await prisma.inventoryStock.create({
      data: {
        itemType: "RAW_MATERIAL",
        rawMaterialId: rawMaterials[i].id,
        quantityOnHand: initialStockRM[i],
        location: rawMaterials[i].storageLocation || "dry_store",
      },
    });
  }

  const products = [pitaLarge, pitaSmall, pitaMedium, laffa, falafelFrozen, hummus1kg, tahini500g, babaGhanoush, pitaChips, zaatar];
  const initialStockFG = [250, 150, 80, 40, 500, 30, 45, 20, 100, 30];

  for (let i = 0; i < products.length; i++) {
    await prisma.inventoryStock.create({
      data: {
        itemType: "FINISHED_GOOD",
        productId: products[i].id,
        quantityOnHand: initialStockFG[i],
      },
    });
  }

  console.log("✅ Inventory stock initialized");

  console.log("\n🎉 Seeding complete!");
  console.log("  Users: admin@pitabakery.sg / manager@pitabakery.sg / floor@pitabakery.sg");
  console.log("  Password: password123");
  console.log("  User: lironbek88@gmail.com / Password: 123456 (ADMIN)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
