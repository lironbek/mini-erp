"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type ProductWithBom = {
  id: string;
  sku: string;
  name: Record<string, string>;
  category: string | null;
  productionLine: string;
  sellingPrice: number | null;
  isActive: boolean;
  boms: { id: string; version: number; isActive: boolean; updatedAt: string }[];
};

export default function BomListPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithBom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?includeBom=true");
      if (res.ok) {
        const data = await res.json();
        // The products API doesn't include BOM data by default,
        // so we fetch BOM status separately
        const productsWithBom = await Promise.all(
          data.map(async (product: ProductWithBom) => {
            const bomRes = await fetch(`/api/bom/${product.id}/versions`);
            const boms = bomRes.ok ? await bomRes.json() : [];
            return { ...product, boms };
          })
        );
        setProducts(productsWithBom);
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function getBomStatus(product: ProductWithBom) {
    if (!product.boms || product.boms.length === 0) return "none";
    const hasActive = product.boms.some((b) => b.isActive);
    return hasActive ? "active" : "outdated";
  }

  const columns: Column<ProductWithBom>[] = [
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
      render: (row) =>
        row.category ? (
          <Badge variant="secondary">
            {t(`products.categories.${row.category}` as never)}
          </Badge>
        ) : "—",
    },
    {
      key: "productionLine",
      header: t("products.productionLine"),
      render: (row) => (
        <Badge variant="outline">
          {t(`products.productionLines.${row.productionLine}` as never)}
        </Badge>
      ),
    },
    {
      key: "bomStatus",
      header: t("bom.bomStatus"),
      render: (row) => {
        const status = getBomStatus(row);
        if (status === "active") {
          const activeBom = row.boms.find((b) => b.isActive);
          return (
            <Badge variant="default">
              {t("bom.hasBom")} (v{activeBom?.version})
            </Badge>
          );
        }
        if (status === "outdated") {
          return <Badge variant="secondary">{t("bom.outdatedBom")}</Badge>;
        }
        return <Badge variant="destructive">{t("bom.noBom")}</Badge>;
      },
    },
    {
      key: "versions",
      header: t("bom.versions"),
      render: (row) => row.boms?.length || 0,
    },
  ];

  const filters = [
    {
      key: "productionLine",
      label: t("products.productionLine"),
      options: [
        { value: "BAKERY", label: t("products.productionLines.BAKERY") },
        { value: "SALADS", label: t("products.productionLines.SALADS") },
        { value: "FROZEN", label: t("products.productionLines.FROZEN") },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("bom.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {t("bom.title")}
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
              onRowClick={(row) => router.push(`/${locale}/production/bom/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
