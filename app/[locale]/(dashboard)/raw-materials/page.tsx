"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Plus, Wheat } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type RawMaterial = {
  id: string;
  sku: string;
  name: Record<string, string>;
  category: string | null;
  unitOfMeasure: string;
  minStockLevel: number;
  lastPurchasePrice: number | null;
  isAllergen: boolean;
  isActive: boolean;
  storageLocation: string | null;
  currentStock: number;
  primarySupplier: { id: string; name: Record<string, string>; shortName: string | null } | null;
};

export default function RawMaterialsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    try {
      const res = await fetch("/api/raw-materials");
      if (res.ok) {
        setMaterials(await res.json());
      }
    } catch {
      toast.error("Failed to load raw materials");
    } finally {
      setLoading(false);
    }
  }

  const columns: Column<RawMaterial>[] = [
    {
      key: "sku",
      header: t("rawMaterials.sku"),
      sortable: true,
      render: (row) => <span className="font-mono text-sm">{row.sku}</span>,
    },
    {
      key: "name",
      header: t("rawMaterials.name"),
      sortable: true,
      accessor: (row) => getLocalizedName(row.name, locale),
      render: (row) => (
        <div>
          <span className="font-medium">{getLocalizedName(row.name, locale)}</span>
          {row.isAllergen && (
            <Badge variant="destructive" className="ms-2 text-xs">
              {t("rawMaterials.isAllergen")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: t("rawMaterials.category"),
      sortable: true,
      render: (row) =>
        row.category ? (
          <Badge variant="secondary">
            {t(`rawMaterials.categories.${row.category}` as never)}
          </Badge>
        ) : "—",
    },
    {
      key: "unitOfMeasure",
      header: t("rawMaterials.unitOfMeasure"),
      render: (row) => t(`units.${row.unitOfMeasure}` as never),
    },
    {
      key: "primarySupplier",
      header: t("rawMaterials.primarySupplier"),
      render: (row) =>
        row.primarySupplier
          ? row.primarySupplier.shortName || getLocalizedName(row.primarySupplier.name, locale)
          : "—",
    },
    {
      key: "currentStock",
      header: t("rawMaterials.stock"),
      sortable: true,
      render: (row) => {
        const isLow = row.currentStock <= Number(row.minStockLevel);
        return (
          <span className={isLow ? "text-destructive font-semibold" : ""}>
            {row.currentStock}
          </span>
        );
      },
    },
    {
      key: "lastPurchasePrice",
      header: t("rawMaterials.lastPrice"),
      sortable: true,
      render: (row) =>
        row.lastPurchasePrice ? `$${Number(row.lastPurchasePrice).toFixed(2)}` : "—",
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
      label: t("rawMaterials.category"),
      options: [
        { value: "flour", label: t("rawMaterials.categories.flour") },
        { value: "oil", label: t("rawMaterials.categories.oil") },
        { value: "spice", label: t("rawMaterials.categories.spice") },
        { value: "packaging", label: t("rawMaterials.categories.packaging") },
        { value: "dairy", label: t("rawMaterials.categories.dairy") },
        { value: "vegetable", label: t("rawMaterials.categories.vegetable") },
        { value: "grain", label: t("rawMaterials.categories.grain") },
        { value: "sauce", label: t("rawMaterials.categories.sauce") },
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
        <h1 className="text-2xl font-bold">{t("rawMaterials.title")}</h1>
        <Button onClick={() => router.push(`/${locale}/raw-materials/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t("rawMaterials.newMaterial")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            {t("rawMaterials.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <DataTable
              data={materials}
              columns={columns}
              searchPlaceholder={`${t("common.search")} ${t("rawMaterials.title").toLowerCase()}...`}
              searchFn={(row, q) =>
                row.sku.toLowerCase().includes(q) ||
                searchMultiLang(row.name, q)
              }
              filters={filters}
              onRowClick={(row) => router.push(`/${locale}/raw-materials/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
