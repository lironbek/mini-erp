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
        setProducts(await res.json());
      }
    } catch {
      toast.error("Failed to load products");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("products.title")}</h1>
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
