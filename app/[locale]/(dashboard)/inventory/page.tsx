"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Package,
  AlertTriangle,
  ArrowLeftRight,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type InventoryItem = {
  id: string;
  sku: string;
  name: Record<string, string>;
  category: string | null;
  unitOfMeasure: string;
  onHand: number;
  reserved: number;
  available: number;
  minLevel: number;
  maxLevel: number | null;
  status: "ok" | "low" | "critical";
  supplier?: { name: Record<string, string>; shortName: string | null } | null;
  isAllergen?: boolean;
  productionLine?: string;
};

const STATUS_ICONS: Record<string, string> = {
  ok: "\u{1F7E2}",
  low: "\u{1F7E1}",
  critical: "\u{1F534}",
};

export default function InventoryPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState("raw_materials");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [tab]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?tab=${tab}`);
      if (res.ok) setItems(await res.json());
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const ok = items.filter((i) => i.status === "ok").length;
    const low = items.filter((i) => i.status === "low").length;
    const critical = items.filter((i) => i.status === "critical").length;
    return { ok, low, critical };
  }, [items]);

  const columns: Column<InventoryItem>[] = [
    {
      key: "sku",
      header: "SKU",
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
      render: (row) => row.category ? <Badge variant="secondary">{row.category}</Badge> : "—",
    },
    {
      key: "onHand",
      header: t("inventory.onHand"),
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.onHand.toFixed(1)}</span>
      ),
    },
    {
      key: "reserved",
      header: t("inventory.reserved"),
      sortable: true,
      render: (row) => row.reserved.toFixed(1),
    },
    {
      key: "available",
      header: t("inventory.available"),
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.available.toFixed(1)}</span>
      ),
    },
    {
      key: "minLevel",
      header: t("inventory.minLevel"),
      render: (row) => row.minLevel.toFixed(1),
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (row) => (
        <span>
          {STATUS_ICONS[row.status]}{" "}
          {t(`inventory.status${row.status.charAt(0).toUpperCase() + row.status.slice(1)}` as never)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/adjust`)}>
            <Plus className="me-1 h-4 w-4" />
            {t("inventory.adjustStock")}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/damage`)}>
            <Minus className="me-1 h-4 w-4" />
            {t("inventory.damageReport")}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/movements`)}>
            <ArrowLeftRight className="me-1 h-4 w-4" />
            {t("inventory.movementHistory")}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-4 pb-4 flex items-center gap-2">
            <span className="text-2xl">{"\u{1F7E2}"}</span>
            <div>
              <p className="text-2xl font-bold">{summary.ok}</p>
              <p className="text-sm text-muted-foreground">{t("inventory.statusOk")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4 pb-4 flex items-center gap-2">
            <span className="text-2xl">{"\u{1F7E1}"}</span>
            <div>
              <p className="text-2xl font-bold">{summary.low}</p>
              <p className="text-sm text-muted-foreground">{t("inventory.statusLow")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4 pb-4 flex items-center gap-2">
            <span className="text-2xl">{"\u{1F534}"}</span>
            <div>
              <p className="text-2xl font-bold">{summary.critical}</p>
              <p className="text-sm text-muted-foreground">{t("inventory.statusCritical")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="raw_materials">{t("inventory.rawMaterials")}</TabsTrigger>
          <TabsTrigger value="finished_goods">{t("inventory.finishedGoods")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {tab === "raw_materials" ? t("inventory.rawMaterials") : t("inventory.finishedGoods")}
                ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
              ) : (
                <DataTable
                  data={items}
                  columns={columns}
                  searchPlaceholder={`${t("common.search")}...`}
                  searchFn={(row, q) =>
                    row.sku.toLowerCase().includes(q) ||
                    searchMultiLang(row.name, q)
                  }
                  filters={[
                    {
                      key: "status",
                      label: t("common.status"),
                      options: [
                        { value: "ok", label: t("inventory.statusOk") },
                        { value: "low", label: t("inventory.statusLow") },
                        { value: "critical", label: t("inventory.statusCritical") },
                      ],
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
