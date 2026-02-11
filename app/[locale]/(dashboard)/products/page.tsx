"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Plus, Box } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type Product = {
  id: string;
  sku: string;
  name: Record<string, string>;
  category: string | null;
  productionLine: string;
  shelfLifeDays: number;
  sellingPrice: number | null;
  costPrice: number | null;
  isActive: boolean;
  currentStock: number;
};

const DUMMY_PRODUCTS: Product[] = [
  { id: "p1", sku: "PB-001", name: { en: "Classic Pita", he: "פיתה קלאסית" }, category: "pita", productionLine: "BAKERY", shelfLifeDays: 5, sellingPrice: 4.50, costPrice: 2.10, isActive: true, currentStock: 1250 },
  { id: "p2", sku: "PB-002", name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" }, category: "pita", productionLine: "BAKERY", shelfLifeDays: 4, sellingPrice: 5.20, costPrice: 2.60, isActive: true, currentStock: 830 },
  { id: "p3", sku: "PB-003", name: { en: "Mini Pita Pack (12)", he: "חבילת מיני פיתות (12)" }, category: "pita", productionLine: "BAKERY", shelfLifeDays: 5, sellingPrice: 6.90, costPrice: 3.20, isActive: true, currentStock: 420 },
  { id: "p4", sku: "LB-001", name: { en: "Laffa Bread", he: "לחם לאפה" }, category: "flatbread", productionLine: "BAKERY", shelfLifeDays: 3, sellingPrice: 3.80, costPrice: 1.80, isActive: true, currentStock: 680 },
  { id: "p5", sku: "PB-004", name: { en: "Sesame Pita", he: "פיתה עם שומשום" }, category: "pita", productionLine: "BAKERY", shelfLifeDays: 5, sellingPrice: 5.50, costPrice: 2.80, isActive: true, currentStock: 390 },
  { id: "p6", sku: "SL-001", name: { en: "Mediterranean Salad", he: "סלט ים תיכוני" }, category: "salad", productionLine: "SALADS", shelfLifeDays: 3, sellingPrice: 12.90, costPrice: 6.50, isActive: true, currentStock: 145 },
  { id: "p7", sku: "SL-002", name: { en: "Hummus Classic", he: "חומוס קלאסי" }, category: "dip", productionLine: "SALADS", shelfLifeDays: 7, sellingPrice: 8.50, costPrice: 3.90, isActive: true, currentStock: 310 },
  { id: "p8", sku: "FZ-001", name: { en: "Frozen Pita (20 pack)", he: "פיתה קפואה (חבילת 20)" }, category: "frozen", productionLine: "FROZEN", shelfLifeDays: 180, sellingPrice: 15.90, costPrice: 7.20, isActive: true, currentStock: 520 },
  { id: "p9", sku: "SN-001", name: { en: "Pita Chips - Sea Salt", he: "צ'יפס פיתה - מלח ים" }, category: "snack", productionLine: "BAKERY", shelfLifeDays: 90, sellingPrice: 7.90, costPrice: 3.10, isActive: true, currentStock: 890 },
  { id: "p10", sku: "PB-005", name: { en: "Gluten Free Pita", he: "פיתה ללא גלוטן" }, category: "pita", productionLine: "BAKERY", shelfLifeDays: 4, sellingPrice: 8.90, costPrice: 5.20, isActive: false, currentStock: 0 },
];

export default function ProductsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.length > 0 ? data : DUMMY_PRODUCTS);
      } else {
        setProducts(DUMMY_PRODUCTS);
      }
    } catch {
      setProducts(DUMMY_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: t("products.sku"),
      sortable: true,
      render: (row) => <span className="font-mono text-sm">{row.sku}</span>,
    },
    {
      key: "name",
      header: t("products.name"),
      sortable: true,
      accessor: (row) => getLocalizedName(row.name, locale),
      render: (row) => (
        <span className="font-medium">{getLocalizedName(row.name, locale)}</span>
      ),
    },
    {
      key: "category",
      header: t("products.category"),
      sortable: true,
      render: (row) =>
        row.category ? (
          <Badge variant="secondary">
            {t(`products.categories.${row.category}` as never)}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "productionLine",
      header: t("products.productionLine"),
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <Badge variant="outline">
          {t(`products.productionLines.${row.productionLine}` as never)}
        </Badge>
      ),
    },
    {
      key: "sellingPrice",
      header: t("products.sellingPrice"),
      sortable: true,
      render: (row) =>
        row.sellingPrice ? `$${Number(row.sellingPrice).toFixed(2)}` : "—",
    },
    {
      key: "currentStock",
      header: t("products.stock"),
      sortable: true,
      render: (row) => row.currentStock,
    },
    {
      key: "isActive",
      header: t("common.status"),
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "destructive"}>
          {row.isActive ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
  ];

  const filters = [
    {
      key: "category",
      label: t("products.category"),
      options: [
        { value: "pita", label: t("products.categories.pita") },
        { value: "flatbread", label: t("products.categories.flatbread") },
        { value: "salad", label: t("products.categories.salad") },
        { value: "frozen", label: t("products.categories.frozen") },
        { value: "snack", label: t("products.categories.snack") },
        { value: "dip", label: t("products.categories.dip") },
      ],
    },
    {
      key: "productionLine",
      label: t("products.productionLine"),
      options: [
        { value: "BAKERY", label: t("products.productionLines.BAKERY") },
        { value: "SALADS", label: t("products.productionLines.SALADS") },
        { value: "FROZEN", label: t("products.productionLines.FROZEN") },
      ],
    },
    {
      key: "isActive",
      label: t("common.status"),
      options: [
        { value: "true", label: t("common.active") },
        { value: "false", label: t("common.inactive") },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("products.title")}</h1>
        <Button onClick={() => router.push(`/${locale}/products/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t("products.newProduct")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            {t("products.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <DataTable
              data={products}
              columns={columns}
              searchPlaceholder={`${t("common.search")} ${t("products.title").toLowerCase()}...`}
              searchFn={(row, q) =>
                row.sku.toLowerCase().includes(q) ||
                searchMultiLang(row.name, q)
              }
              filters={filters}
              onRowClick={(row) => router.push(`/${locale}/products/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
