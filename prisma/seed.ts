import { Prisma, PrismaClient, ProductionLine, UnitOfMeasure, UserRole, OrderStatus, OrderSource, MovementType, ItemType } from "@prisma/client";
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

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomDecimal(min: number, max: number, decimals = 2): number {
    return Number((Math.random() * (max - min) + min).toFixed(decimals));
  }

  function padNum(n: number, len = 4): string {
    return String(n).padStart(len, "0");
  }

  function formatDate(d: Date): string {
    return d.toISOString().split("T")[0].replace(/-/g, "");
  }

  // ============================================================
  // 1. ORDERS (~80 orders over 60 days)
  // ============================================================

  const customerWeights = [
    { customer: customer1, weight: 25 },  // MBS
    { customer: customer2, weight: 20 },  // Raffles
    { customer: customer3, weight: 18 },  // Mandarin
    { customer: customer4, weight: 22 },  // FairPrice
    { customer: customer5, weight: 15 },  // Cedele
  ];

  const sourceWeights: { source: OrderSource; weight: number }[] = [
    { source: OrderSource.MANUAL, weight: 40 },
    { source: OrderSource.WHATSAPP, weight: 25 },
    { source: OrderSource.EMAIL, weight: 20 },
    { source: OrderSource.ARIBA, weight: 10 },
    { source: OrderSource.PORTAL, weight: 5 },
  ];

  // Status distribution for 80 orders
  const statusSequence: OrderStatus[] = [
    ...Array(40).fill(OrderStatus.DELIVERED),
    ...Array(12).fill(OrderStatus.DISPATCHED),
    ...Array(6).fill(OrderStatus.READY),
    ...Array(6).fill(OrderStatus.IN_PRODUCTION),
    ...Array(6).fill(OrderStatus.CONFIRMED),
    ...Array(5).fill(OrderStatus.PENDING),
    ...Array(2).fill(OrderStatus.DRAFT),
    ...Array(3).fill(OrderStatus.CANCELLED),
  ];

  function pickWeighted<T>(items: { item: T; weight: number }[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const entry of items) {
      r -= entry.weight;
      if (r <= 0) return entry.item;
    }
    return items[items.length - 1].item;
  }

  const bakeryProducts = [pitaLarge, pitaSmall, pitaMedium, laffa, pitaChips, zaatar];
  const saladsProducts = [hummus1kg, tahini500g, babaGhanoush];
  const frozenProducts = [falafelFrozen];

  const qtyRanges: Record<string, [number, number]> = {
    [pitaLarge.id]: [80, 200],
    [pitaSmall.id]: [60, 150],
    [pitaMedium.id]: [40, 120],
    [laffa.id]: [20, 60],
    [falafelFrozen.id]: [50, 200],
    [hummus1kg.id]: [10, 40],
    [tahini500g.id]: [10, 30],
    [babaGhanoush.id]: [5, 20],
    [pitaChips.id]: [10, 50],
    [zaatar.id]: [10, 40],
  };

  const allOrderProducts = [...bakeryProducts, ...saladsProducts, ...frozenProducts];

  const createdOrders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    orderDate: Date;
    customerId: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }>;
  }> = [];

  let orderSeq = 1;
  const totalOrders = 80;

  // Generate order dates - more orders in recent days
  const orderDates: Date[] = [];
  for (let i = 0; i < totalOrders; i++) {
    // Weight towards more recent days: use quadratic distribution
    const t = Math.random();
    const daysBack = Math.floor(60 * t * t); // squares bias towards 0 (recent)
    orderDates.push(daysAgo(daysBack));
  }
  orderDates.sort((a, b) => a.getTime() - b.getTime());

  console.log("  Creating orders...");

  for (let i = 0; i < totalOrders; i++) {
    const orderDate = orderDates[i];
    const status = statusSequence[i];
    const custEntry = pickWeighted(
      customerWeights.map((c) => ({ item: c.customer, weight: c.weight }))
    );
    const source = pickWeighted(
      sourceWeights.map((s) => ({ item: s.source, weight: s.weight }))
    );
    const createdBy = i % 2 === 0 ? admin : manager;

    // Pick 2-4 random products
    const numItems = randomBetween(2, 4);
    const shuffled = [...allOrderProducts].sort(() => Math.random() - 0.5);
    const selectedProducts = shuffled.slice(0, numItems);

    const orderItems = selectedProducts.map((prod, idx) => {
      const [minQ, maxQ] = qtyRanges[prod.id];
      const qty = randomBetween(minQ, maxQ);
      const unitPrice = Number(prod.sellingPrice);
      return {
        productId: prod.id,
        quantity: qty,
        unitPrice,
        totalPrice: Number((qty * unitPrice).toFixed(2)),
        sortOrder: idx + 1,
      };
    });

    const subtotal = orderItems.reduce((s, item) => s + item.totalPrice, 0);
    const taxAmount = Number((subtotal * 0.09).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    const reqDelivery = new Date(orderDate);
    reqDelivery.setDate(reqDelivery.getDate() + 1);

    const confirmedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.LOCKED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DISPATCHED,
      OrderStatus.DELIVERED,
    ];
    const hasConfirmedDate = confirmedStatuses.includes(status);

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${formatDate(orderDate)}-${padNum(orderSeq)}`,
        customerId: custEntry.id,
        source,
        status,
        orderDate,
        requestedDeliveryDate: reqDelivery,
        confirmedDeliveryDate: hasConfirmedDate ? reqDelivery : null,
        deliverySlot: custEntry.defaultDeliverySlot,
        subtotal,
        taxAmount,
        totalAmount,
        createdById: createdBy.id,
        createdAt: orderDate,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    createdOrders.push({
      id: order.id,
      orderNumber: order.orderNumber,
      status,
      orderDate,
      customerId: custEntry.id,
      items: orderItems,
    });

    orderSeq++;
  }

  console.log(`  ✅ ${createdOrders.length} orders created`);

  // ============================================================
  // 2. WORK ORDERS (~40 over 60 days)
  // ============================================================

  const productionLineWeights = [
    { item: ProductionLine.BAKERY, weight: 60 },
    { item: ProductionLine.SALADS, weight: 25 },
    { item: ProductionLine.FROZEN, weight: 15 },
  ];

  const productsByLine: Record<string, typeof products> = {
    BAKERY: bakeryProducts,
    SALADS: saladsProducts,
    FROZEN: frozenProducts,
  };

  const plannedQtyRanges: Record<string, [number, number]> = {
    BAKERY: [100, 300],
    SALADS: [30, 80],
    FROZEN: [100, 300],
  };

  const wasteReasons = [
    "overproduction",
    "quality_reject",
    "machine_error",
    "raw_material_defect",
    "expired",
  ];

  // WO statuses: completed(30), in_progress(2), planned(4), cancelled(4)
  const woStatusSequence: string[] = [
    ...Array(30).fill("completed"),
    ...Array(2).fill("in_progress"),
    ...Array(4).fill("planned"),
    ...Array(4).fill("cancelled"),
  ];

  // Generate work dates - weekdays only over 60 days
  const workDates: Date[] = [];
  for (let d = 60; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      workDates.push(date);
    }
  }

  // Pick ~40 dates spread across the available weekdays
  const selectedWorkDates: Date[] = [];
  const step = Math.max(1, Math.floor(workDates.length / 40));
  for (let i = 0; i < workDates.length && selectedWorkDates.length < 40; i += step) {
    selectedWorkDates.push(workDates[i]);
  }
  // If we didn't get 40, fill remaining from unused dates
  if (selectedWorkDates.length < 40) {
    for (const wd of workDates) {
      if (selectedWorkDates.length >= 40) break;
      if (!selectedWorkDates.includes(wd)) {
        selectedWorkDates.push(wd);
      }
    }
  }
  selectedWorkDates.sort((a, b) => a.getTime() - b.getTime());

  const createdWorkOrders: Array<{
    id: string;
    woNumber: string;
    productionDate: Date;
    productionLine: ProductionLine;
    status: string;
    plannedStart: Date;
    actualStart: Date | null;
    actualEnd: Date | null;
    items: Array<{
      id: string;
      productId: string;
      bomId: string | null;
      plannedQuantity: number;
      producedQuantity: number;
      wasteQuantity: number;
      wasteReason: string | null;
      batchNumber: string;
      expiryDate: Date;
      status: string;
    }>;
  }> = [];

  let woSeq = 1;
  let batchSeq = 1;

  console.log("  Creating work orders...");

  for (let i = 0; i < selectedWorkDates.length; i++) {
    const prodDate = selectedWorkDates[i];
    const woStatus = woStatusSequence[i] || "planned";
    const line = pickWeighted(productionLineWeights);
    const lineProducts = productsByLine[line];

    const plannedStart = new Date(prodDate);
    plannedStart.setHours(5, 0, 0, 0);

    let actualStart: Date | null = null;
    let actualEnd: Date | null = null;

    if (woStatus === "completed" || woStatus === "in_progress") {
      actualStart = new Date(plannedStart);
    }
    if (woStatus === "completed") {
      const hoursToComplete = randomBetween(3, 6);
      actualEnd = new Date(plannedStart);
      actualEnd.setHours(actualEnd.getHours() + hoursToComplete);
    }

    // Pick 2-3 items from the production line
    const numWoItems = Math.min(randomBetween(2, 3), lineProducts.length);
    const shuffledLineProducts = [...lineProducts].sort(() => Math.random() - 0.5);
    const woProducts = shuffledLineProducts.slice(0, numWoItems);

    const woItemsData: Array<{
      productId: string;
      bomId: string | null;
      plannedQuantity: number;
      producedQuantity: number;
      wasteQuantity: number;
      wasteReason: string | null;
      batchNumber: string;
      productionDate: Date;
      expiryDate: Date;
      status: string;
      sortOrder: number;
    }> = [];

    for (let j = 0; j < woProducts.length; j++) {
      const prod = woProducts[j];
      const [minPQ, maxPQ] = plannedQtyRanges[line];
      const plannedQty = randomBetween(minPQ, maxPQ);

      // Find BOM for this product
      const bom = await prisma.bom.findFirst({
        where: { productId: prod.id, isActive: true },
      });

      let producedQty = 0;
      let wasteQty = 0;
      let wasteReason: string | null = null;
      let itemStatus = "pending";

      if (woStatus === "completed") {
        producedQty = Math.round(plannedQty * randomDecimal(0.9, 1.05, 2));
        wasteQty = Math.round(producedQty * randomDecimal(0.02, 0.08, 3));
        wasteReason = wasteReasons[randomBetween(0, wasteReasons.length - 1)];
        itemStatus = "completed";
      } else if (woStatus === "in_progress") {
        producedQty = Math.round(plannedQty * randomDecimal(0.3, 0.6, 2));
        wasteQty = Math.round(producedQty * randomDecimal(0.02, 0.05, 3));
        wasteReason = wasteReasons[randomBetween(0, wasteReasons.length - 1)];
        itemStatus = "in_progress";
      }

      const batchNumber = `B-${formatDate(prodDate)}-${padNum(batchSeq)}`;
      batchSeq++;

      const expiryDate = new Date(prodDate);
      expiryDate.setDate(expiryDate.getDate() + prod.shelfLifeDays);

      woItemsData.push({
        productId: prod.id,
        bomId: bom?.id || null,
        plannedQuantity: plannedQty,
        producedQuantity: producedQty,
        wasteQuantity: wasteQty,
        wasteReason,
        batchNumber,
        productionDate: prodDate,
        expiryDate,
        status: itemStatus,
        sortOrder: j + 1,
      });
    }

    const wo = await prisma.workOrder.create({
      data: {
        woNumber: `WO-${formatDate(prodDate)}-${padNum(woSeq)}`,
        productionDate: prodDate,
        productionLine: line,
        status: woStatus,
        plannedStart,
        actualStart,
        actualEnd,
        createdById: production.id,
        createdAt: prodDate,
        items: {
          create: woItemsData.map((item) => ({
            productId: item.productId,
            bomId: item.bomId,
            plannedQuantity: item.plannedQuantity,
            producedQuantity: item.producedQuantity,
            wasteQuantity: item.wasteQuantity,
            wasteReason: item.wasteReason,
            batchNumber: item.batchNumber,
            productionDate: item.productionDate,
            expiryDate: item.expiryDate,
            status: item.status,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { items: true },
    });

    createdWorkOrders.push({
      id: wo.id,
      woNumber: wo.woNumber,
      productionDate: prodDate,
      productionLine: line,
      status: woStatus,
      plannedStart,
      actualStart,
      actualEnd,
      items: wo.items.map((woItem, idx) => ({
        id: woItem.id,
        productId: woItem.productId,
        bomId: woItem.bomId,
        plannedQuantity: Number(woItem.plannedQuantity),
        producedQuantity: Number(woItem.producedQuantity),
        wasteQuantity: Number(woItem.wasteQuantity),
        wasteReason: woItem.wasteReason,
        batchNumber: woItemsData[idx].batchNumber,
        expiryDate: woItemsData[idx].expiryDate,
        status: woItem.status,
      })),
    });

    woSeq++;
  }

  console.log(`  ✅ ${createdWorkOrders.length} work orders created`);

  // ============================================================
  // 3. PRODUCTION REPORTS (one per completed WorkOrderItem)
  // ============================================================

  console.log("  Creating production reports...");

  let prodReportCount = 0;
  const completedWOs = createdWorkOrders.filter((wo) => wo.status === "completed");

  for (const wo of completedWOs) {
    for (const woItem of wo.items) {
      if (woItem.status === "completed" && woItem.producedQuantity > 0) {
        const prodTimestamp = new Date(wo.plannedStart);
        prodTimestamp.setHours(prodTimestamp.getHours() + 2);

        await prisma.productionReport.create({
          data: {
            workOrderItemId: woItem.id,
            reportedById: production.id,
            quantityProduced: woItem.producedQuantity,
            quantityWaste: woItem.wasteQuantity,
            wasteReason: woItem.wasteReason,
            batchNumber: woItem.batchNumber,
            productionTimestamp: prodTimestamp,
          },
        });
        prodReportCount++;
      }
    }
  }

  console.log(`  ✅ ${prodReportCount} production reports created`);

  // ============================================================
  // 4. PURCHASE ORDERS (~15 POs)
  // ============================================================

  console.log("  Creating purchase orders...");

  // Supplier -> materials mapping
  const supplier1Materials = [flour55, flour00, yeast, packagingBag, packagingTub]; // SFM: flour, packaging
  const supplier2Materials = [oliveOil, vegetableOil]; // APO: oils
  const supplier3Materials = [salt, sugar, tahiniRaw, chickpeas, lemon, garlic, cumin, eggplant]; // SIT: spices, others

  const poStatusSequence: string[] = [
    ...Array(9).fill("received"),
    ...Array(2).fill("partially_received"),
    ...Array(2).fill("confirmed"),
    ...Array(1).fill("sent"),
    ...Array(1).fill("draft"),
  ];

  interface CreatedPO {
    id: string;
    poNumber: string;
    supplierId: string;
    status: string;
    orderDate: Date;
    items: Array<{
      id: string;
      rawMaterialId: string;
      quantityOrdered: number;
      quantityReceived: number;
      unitPrice: number;
      unit: UnitOfMeasure;
    }>;
  }

  const createdPOs: CreatedPO[] = [];
  let poSeq = 1;

  const supplierConfigs = [
    { supplier: supplier1, materials: supplier1Materials, freq: 6 },  // 6 POs
    { supplier: supplier2, materials: supplier2Materials, freq: 4 },  // 4 POs
    { supplier: supplier3, materials: supplier3Materials, freq: 5 },  // 5 POs
  ];

  // Qty ranges for PO items by category
  const poQtyRanges: Record<string, [number, number]> = {
    flour: [100, 300],
    oil: [20, 60],
    spice: [5, 15],
    baking: [5, 20],
    paste: [20, 60],
    legume: [30, 80],
    fruit: [10, 25],
    packaging: [200, 500],
    vegetable: [15, 40],
  };

  for (const config of supplierConfigs) {
    for (let p = 0; p < config.freq; p++) {
      const poStatus = poStatusSequence[createdPOs.length] || "draft";
      const poDaysAgo = randomBetween(5, 55);
      const poOrderDate = daysAgo(poDaysAgo);

      // Pick 2-4 materials from this supplier
      const numItems = Math.min(randomBetween(2, 4), config.materials.length);
      const shuffledMats = [...config.materials].sort(() => Math.random() - 0.5);
      const selectedMats = shuffledMats.slice(0, numItems);

      const poItemsData = selectedMats.map((mat, idx) => {
        const category = mat.category || "other";
        const [minQ, maxQ] = poQtyRanges[category] || [10, 50];
        const qtyOrdered = randomDecimal(minQ, maxQ, 1);
        const basePrice = Number(mat.lastPurchasePrice || 1);
        const unitPrice = Number((basePrice * randomDecimal(0.95, 1.05, 4)).toFixed(4));

        let qtyReceived = 0;
        if (poStatus === "received") {
          qtyReceived = qtyOrdered;
        } else if (poStatus === "partially_received") {
          qtyReceived = Number((qtyOrdered * randomDecimal(0.4, 0.7, 2)).toFixed(1));
        }

        return {
          rawMaterialId: mat.id,
          quantityOrdered: qtyOrdered,
          quantityReceived: qtyReceived,
          unit: mat.unitOfMeasure,
          unitPrice,
          totalPrice: Number((qtyOrdered * unitPrice).toFixed(2)),
          sortOrder: idx + 1,
        };
      });

      const poSubtotal = poItemsData.reduce((s, item) => s + item.totalPrice, 0);
      const poTax = Number((poSubtotal * 0.09).toFixed(2));
      const poTotal = Number((poSubtotal + poTax).toFixed(2));

      const expectedDelivery = new Date(poOrderDate);
      expectedDelivery.setDate(expectedDelivery.getDate() + config.supplier.leadTimeDays);

      let actualDelivery: Date | null = null;
      if (poStatus === "received" || poStatus === "partially_received") {
        actualDelivery = new Date(expectedDelivery);
        actualDelivery.setDate(actualDelivery.getDate() + randomBetween(-1, 1));
      }

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-${formatDate(poOrderDate)}-${padNum(poSeq)}`,
          supplierId: config.supplier.id,
          status: poStatus,
          orderDate: poOrderDate,
          expectedDeliveryDate: expectedDelivery,
          actualDeliveryDate: actualDelivery,
          subtotal: poSubtotal,
          taxAmount: poTax,
          totalAmount: poTotal,
          createdById: admin.id,
          createdAt: poOrderDate,
          items: {
            create: poItemsData.map((item) => ({
              rawMaterialId: item.rawMaterialId,
              quantityOrdered: item.quantityOrdered,
              quantityReceived: item.quantityReceived,
              unit: item.unit,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: { items: true },
      });

      createdPOs.push({
        id: po.id,
        poNumber: po.poNumber,
        supplierId: config.supplier.id,
        status: poStatus,
        orderDate: poOrderDate,
        items: po.items.map((item) => ({
          id: item.id,
          rawMaterialId: item.rawMaterialId,
          quantityOrdered: Number(item.quantityOrdered),
          quantityReceived: Number(item.quantityReceived),
          unitPrice: Number(item.unitPrice),
          unit: item.unit,
        })),
      });

      poSeq++;
    }
  }

  console.log(`  ✅ ${createdPOs.length} purchase orders created`);

  // ============================================================
  // 5. INVENTORY MOVEMENTS (~150+)
  // ============================================================

  console.log("  Creating inventory movements...");

  let movementCount = 0;

  // 5a. PRODUCTION_OUTPUT for each completed work order item
  for (const wo of completedWOs) {
    for (const woItem of wo.items) {
      if (woItem.status === "completed" && woItem.producedQuantity > 0) {
        const prod = products.find((p) => p.id === woItem.productId);
        if (!prod) continue;

        await prisma.inventoryMovement.create({
          data: {
            itemType: ItemType.FINISHED_GOOD,
            productId: woItem.productId,
            movementType: MovementType.PRODUCTION_OUTPUT,
            quantity: woItem.producedQuantity,
            unit: prod.unitOfMeasure,
            referenceType: "work_order",
            referenceId: wo.id,
            batchNumber: woItem.batchNumber,
            expiryDate: woItem.expiryDate,
            reportedById: production.id,
            createdAt: wo.actualEnd || wo.plannedStart,
          },
        });
        movementCount++;

        // 5b. PRODUCTION_INPUT for each BOM item
        if (woItem.bomId) {
          const bomItems = await prisma.bomItem.findMany({
            where: { bomId: woItem.bomId },
            include: { rawMaterial: true },
          });

          for (const bomItem of bomItems) {
            // Calculate expected consumption: (producedQuantity / standardBatchSize) * bomItem.quantity
            const bom = await prisma.bom.findUnique({ where: { id: woItem.bomId! } });
            const batchSize = Number(bom?.standardBatchSize || 100);
            const expectedQty = (woItem.producedQuantity / batchSize) * Number(bomItem.quantity);
            const actualQty = Number((expectedQty * randomDecimal(0.95, 1.08, 3)).toFixed(3));

            await prisma.inventoryMovement.create({
              data: {
                itemType: ItemType.RAW_MATERIAL,
                rawMaterialId: bomItem.rawMaterialId,
                movementType: MovementType.PRODUCTION_INPUT,
                quantity: -Math.abs(actualQty),
                unit: bomItem.unit,
                referenceType: "work_order",
                referenceId: wo.id,
                batchNumber: woItem.batchNumber,
                reportedById: production.id,
                createdAt: wo.actualStart || wo.plannedStart,
              },
            });
            movementCount++;
          }
        }
      }
    }
  }

  // 5c. PURCHASE_RECEIPT for each received/partially_received PO item
  const receivedPOs = createdPOs.filter(
    (po) => po.status === "received" || po.status === "partially_received"
  );

  for (const po of receivedPOs) {
    for (const poItem of po.items) {
      if (poItem.quantityReceived > 0) {
        await prisma.inventoryMovement.create({
          data: {
            itemType: ItemType.RAW_MATERIAL,
            rawMaterialId: poItem.rawMaterialId,
            movementType: MovementType.PURCHASE_RECEIPT,
            quantity: poItem.quantityReceived,
            unit: poItem.unit,
            referenceType: "purchase_order",
            referenceId: po.id,
            costPerUnit: poItem.unitPrice,
            totalCost: Number((poItem.quantityReceived * poItem.unitPrice).toFixed(2)),
            reportedById: admin.id,
            createdAt: po.orderDate,
          },
        });
        movementCount++;
      }
    }
  }

  // 5d. WASTE movements (~10)
  for (let w = 0; w < 10; w++) {
    const wasteProduct = products[randomBetween(0, products.length - 1)];
    const wasteDate = daysAgo(randomBetween(1, 40));
    const wasteQty = randomDecimal(2, 15, 1);

    await prisma.inventoryMovement.create({
      data: {
        itemType: ItemType.FINISHED_GOOD,
        productId: wasteProduct.id,
        movementType: MovementType.WASTE,
        quantity: -wasteQty,
        unit: wasteProduct.unitOfMeasure,
        referenceType: "adjustment",
        reason: wasteReasons[randomBetween(0, wasteReasons.length - 1)],
        reportedById: production.id,
        createdAt: wasteDate,
      },
    });
    movementCount++;
  }

  // 5e. DAMAGED movements (~5)
  for (let dm = 0; dm < 5; dm++) {
    const damagedMat = rawMaterials[randomBetween(0, rawMaterials.length - 1)];
    const damageDate = daysAgo(randomBetween(1, 30));

    await prisma.inventoryMovement.create({
      data: {
        itemType: ItemType.RAW_MATERIAL,
        rawMaterialId: damagedMat.id,
        movementType: MovementType.DAMAGED,
        quantity: -randomDecimal(1, 10, 1),
        unit: damagedMat.unitOfMeasure,
        referenceType: "adjustment",
        reason: "Damaged during storage/handling",
        reportedById: admin.id,
        createdAt: damageDate,
      },
    });
    movementCount++;
  }

  // 5f. ADJUSTMENT_PLUS (~5)
  for (let ap = 0; ap < 5; ap++) {
    const adjProduct = products[randomBetween(0, products.length - 1)];
    const adjDate = daysAgo(randomBetween(1, 30));

    await prisma.inventoryMovement.create({
      data: {
        itemType: ItemType.FINISHED_GOOD,
        productId: adjProduct.id,
        movementType: MovementType.ADJUSTMENT_PLUS,
        quantity: randomDecimal(5, 25, 0),
        unit: adjProduct.unitOfMeasure,
        referenceType: "adjustment",
        reason: "Stock count correction - found additional stock",
        reportedById: admin.id,
        createdAt: adjDate,
      },
    });
    movementCount++;
  }

  // 5g. ADJUSTMENT_MINUS (~5)
  for (let am = 0; am < 5; am++) {
    const adjMat = rawMaterials[randomBetween(0, rawMaterials.length - 1)];
    const adjDate = daysAgo(randomBetween(1, 30));

    await prisma.inventoryMovement.create({
      data: {
        itemType: ItemType.RAW_MATERIAL,
        rawMaterialId: adjMat.id,
        movementType: MovementType.ADJUSTMENT_MINUS,
        quantity: -randomDecimal(2, 10, 1),
        unit: adjMat.unitOfMeasure,
        referenceType: "adjustment",
        reason: "Stock count correction - discrepancy found",
        reportedById: manager.id,
        createdAt: adjDate,
      },
    });
    movementCount++;
  }

  console.log(`  ✅ ${movementCount} inventory movements created`);

  // ============================================================
  // 6. NOTIFICATIONS (~25)
  // ============================================================

  console.log("  Creating notifications...");

  const notificationConfigs: Array<{
    type: string;
    title: { en: string; he: string };
    body: { en: string; he: string };
  }> = [
    // low_stock (5)
    {
      type: "low_stock",
      title: { en: "Low Stock Alert: Flour Type 55", he: "התראת מלאי נמוך: קמח סוג 55" },
      body: { en: "Flour Type 55 is below reorder point. Current stock: 85 KG. Reorder point: 100 KG.", he: "קמח סוג 55 מתחת לנקודת הזמנה. מלאי נוכחי: 85 ק\"ג. נקודת הזמנה: 100 ק\"ג." },
    },
    {
      type: "low_stock",
      title: { en: "Low Stock Alert: Fresh Yeast", he: "התראת מלאי נמוך: שמרים טריים" },
      body: { en: "Fresh Yeast is below reorder point. Current stock: 3 KG. Reorder point: 5 KG.", he: "שמרים טריים מתחת לנקודת הזמנה. מלאי נוכחי: 3 ק\"ג. נקודת הזמנה: 5 ק\"ג." },
    },
    {
      type: "low_stock",
      title: { en: "Low Stock Alert: Olive Oil", he: "התראת מלאי נמוך: שמן זית" },
      body: { en: "Olive Oil Extra Virgin is below reorder point. Current stock: 15 L. Reorder point: 20 L.", he: "שמן זית כתית מעולה מתחת לנקודת הזמנה. מלאי נוכחי: 15 ל. נקודת הזמנה: 20 ל." },
    },
    {
      type: "low_stock",
      title: { en: "Low Stock Alert: Chickpeas", he: "התראת מלאי נמוך: חומוס" },
      body: { en: "Dried Chickpeas stock is running low. Current stock: 35 KG. Reorder point: 40 KG.", he: "מלאי חומוס מיובש נמוך. מלאי נוכחי: 35 ק\"ג. נקודת הזמנה: 40 ק\"ג." },
    },
    {
      type: "low_stock",
      title: { en: "Low Stock Alert: Packaging Bags", he: "התראת מלאי נמוך: שקיות אריזה" },
      body: { en: "Packaging Bag 20pk below reorder point. Current: 180 PCS. Reorder: 200 PCS.", he: "שקית אריזה 20 יח מתחת לנקודת הזמנה. נוכחי: 180 יח. הזמנה: 200 יח." },
    },
    // order_reminder (5)
    {
      type: "order_reminder",
      title: { en: "Order Reminder: MBS Delivery Tomorrow", he: "תזכורת הזמנה: משלוח MBS מחר" },
      body: { en: "Order ORD-20260211 for Marina Bay Sands is scheduled for delivery tomorrow at 06:00-08:00.", he: "הזמנה ORD-20260211 עבור מרינה ביי סנדס מתוכננת למשלוח מחר ב-06:00-08:00." },
    },
    {
      type: "order_reminder",
      title: { en: "Order Reminder: Raffles Hotel", he: "תזכורת הזמנה: מלון רפלס" },
      body: { en: "Order for Raffles Hotel pending confirmation. Please review and confirm.", he: "הזמנה למלון רפלס ממתינה לאישור. נא לבדוק ולאשר." },
    },
    {
      type: "order_reminder",
      title: { en: "Order Cutoff Approaching: FairPrice", he: "מועד סיום הזמנות מתקרב: FairPrice" },
      body: { en: "Order cutoff for FairPrice is at 15:00 today. 2 pending orders need confirmation.", he: "מועד סיום הזמנות FairPrice ב-15:00 היום. 2 הזמנות ממתינות לאישור." },
    },
    {
      type: "order_reminder",
      title: { en: "Recurring Order Due: Cedele", he: "הזמנה חוזרת: Cedele" },
      body: { en: "Weekly recurring order for Cedele Restaurant Group is due today.", he: "הזמנה שבועית חוזרת עבור קבוצת מסעדות Cedele מגיעה היום." },
    },
    {
      type: "order_reminder",
      title: { en: "Order Locked: Mandarin Oriental", he: "הזמנה ננעלה: מנדרין אוריינטל" },
      body: { en: "Order for Mandarin Oriental has been locked for production. No further changes allowed.", he: "הזמנה עבור מנדרין אוריינטל ננעלה לייצור. לא ניתן לבצע שינויים נוספים." },
    },
    // production_complete (5)
    {
      type: "production_complete",
      title: { en: "Production Complete: Pita Large Batch", he: "ייצור הושלם: מנת פיתה גדולה" },
      body: { en: "Work order WO completed. 250 pcs of Pita Bread Large produced. Waste: 12 pcs (4.8%).", he: "הזמנת עבודה WO הושלמה. 250 יח פיתה גדולה יוצרו. פסולת: 12 יח (4.8%)." },
    },
    {
      type: "production_complete",
      title: { en: "Production Complete: Hummus Batch", he: "ייצור הושלם: מנת חומוס" },
      body: { en: "Hummus 1kg batch completed. 45 tubs produced with 2 tubs waste.", he: "מנת חומוס 1 ק\"ג הושלמה. 45 מיכלים יוצרו עם 2 מיכלי פסולת." },
    },
    {
      type: "production_complete",
      title: { en: "Production Complete: Falafel Batch", he: "ייצור הושלם: מנת פלאפל" },
      body: { en: "Frozen Falafel production complete. 180 pcs produced and moved to freezer.", he: "ייצור פלאפל קפוא הושלם. 180 יח יוצרו והועברו למקפיא." },
    },
    {
      type: "production_complete",
      title: { en: "Production Complete: Laffa Batch", he: "ייצור הושלם: מנת לאפה" },
      body: { en: "Laffa Flatbread batch completed. 48 pcs produced. Ready for dispatch.", he: "מנת לאפה הושלמה. 48 יח יוצרו. מוכן למשלוח." },
    },
    {
      type: "production_complete",
      title: { en: "Production Complete: Za'atar Manakish", he: "ייצור הושלם: מנאקיש זעתר" },
      body: { en: "Za'atar Manakish batch complete. 60 pcs produced with excellent quality.", he: "מנת מנאקיש זעתר הושלמה. 60 יח יוצרו באיכות מצוינת." },
    },
    // po_delivered (3)
    {
      type: "po_delivered",
      title: { en: "PO Delivered: Singapore Flour Mills", he: "הזמנת רכש התקבלה: טחנות קמח סינגפור" },
      body: { en: "Purchase order from Singapore Flour Mills received. 200 KG Flour Type 55 + 150 KG Flour Type 00.", he: "הזמנת רכש מטחנות קמח סינגפור התקבלה. 200 ק\"ג קמח 55 + 150 ק\"ג קמח 00." },
    },
    {
      type: "po_delivered",
      title: { en: "PO Delivered: Asia Pacific Oils", he: "הזמנת רכש התקבלה: שמני אסיה פסיפיק" },
      body: { en: "Olive Oil and Vegetable Oil delivery received from Asia Pacific Oils.", he: "משלוח שמן זית ושמן צמחי התקבל משמני אסיה פסיפיק." },
    },
    {
      type: "po_delivered",
      title: { en: "PO Partially Received: Spice Island", he: "הזמנת רכש התקבלה חלקית: אי התבלינים" },
      body: { en: "Partial delivery from Spice Island Trading. Chickpeas received, tahini still pending.", he: "משלוח חלקי מסחר אי התבלינים. חומוס התקבל, טחינה עדיין בהמתנה." },
    },
    // expiry_warning (3)
    {
      type: "expiry_warning",
      title: { en: "Expiry Warning: Pita Bread Large", he: "התראת תפוגה: פיתה גדולה" },
      body: { en: "50 pcs of Pita Bread Large (Batch B-20260208) expire in 2 days.", he: "50 יח פיתה גדולה (מנה B-20260208) פגות תוקף בעוד 2 ימים." },
    },
    {
      type: "expiry_warning",
      title: { en: "Expiry Warning: Hummus 1kg", he: "התראת תפוגה: חומוס 1 ק\"ג" },
      body: { en: "15 tubs of Hummus 1kg approaching expiry. Batch B-20260205 expires in 3 days.", he: "15 מיכלי חומוס 1 ק\"ג מתקרבים לתפוגה. מנה B-20260205 פגה בעוד 3 ימים." },
    },
    {
      type: "expiry_warning",
      title: { en: "Expiry Warning: Baba Ghanoush", he: "התראת תפוגה: בבא גנוש" },
      body: { en: "8 tubs of Baba Ghanoush 1kg (Batch B-20260206) expire tomorrow.", he: "8 מיכלי בבא גנוש 1 ק\"ג (מנה B-20260206) פגים מחר." },
    },
    // system (4)
    {
      type: "system",
      title: { en: "System Update: New Features Available", he: "עדכון מערכת: תכונות חדשות זמינות" },
      body: { en: "New dashboard analytics and WhatsApp integration features are now available.", he: "ניתוח לוח מחוונים חדש ותכונות שילוב WhatsApp זמינים כעת." },
    },
    {
      type: "system",
      title: { en: "Scheduled Maintenance: Sunday 2am-4am", he: "תחזוקה מתוכננת: יום ראשון 2:00-4:00" },
      body: { en: "System maintenance scheduled for Sunday 2:00 AM - 4:00 AM SGT. Brief downtime expected.", he: "תחזוקת מערכת מתוכננת ליום ראשון 2:00-4:00 לפנות בוקר. צפוי השבתה קצרה." },
    },
    {
      type: "system",
      title: { en: "Daily Summary: Production Report", he: "סיכום יומי: דוח ייצור" },
      body: { en: "Today's production: 450 pita, 35 hummus, 120 falafel. All targets met.", he: "ייצור היום: 450 פיתות, 35 חומוס, 120 פלאפל. כל היעדים הושגו." },
    },
    {
      type: "system",
      title: { en: "Backup Complete", he: "גיבוי הושלם" },
      body: { en: "Nightly database backup completed successfully at 03:00 AM.", he: "גיבוי מסד נתונים לילי הושלם בהצלחה ב-03:00 לפנות בוקר." },
    },
  ];

  const notifUsers = [admin, manager];

  for (let n = 0; n < notificationConfigs.length; n++) {
    const config = notificationConfigs[n];
    const userId = notifUsers[n % notifUsers.length].id;
    const createdDaysAgo = randomBetween(0, 13);
    const createdAt = daysAgo(createdDaysAgo);
    const isRead = Math.random() < 0.7;
    const readAt = isRead
      ? new Date(createdAt.getTime() + randomBetween(30, 720) * 60 * 1000)
      : null;

    await prisma.notification.create({
      data: {
        userId,
        channel: "in_app",
        type: config.type,
        title: config.title,
        body: config.body,
        isRead,
        sentAt: createdAt,
        readAt,
        createdAt,
      },
    });
  }

  console.log(`  ✅ ${notificationConfigs.length} notifications created`);

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
