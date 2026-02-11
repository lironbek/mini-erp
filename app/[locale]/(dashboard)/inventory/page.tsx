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

const DUMMY_RAW_MATERIALS: InventoryItem[] = [
  { id: "rm1", sku: "RM-001", name: { en: "Bread Flour (25kg)", he: "קמח לחם (25 ק\"ג)" }, category: "flour", unitOfMeasure: "kg", onHand: 850, reserved: 200, available: 650, minLevel: 500, maxLevel: 2000, status: "ok" },
  { id: "rm2", sku: "RM-002", name: { en: "Whole Wheat Flour (25kg)", he: "קמח חיטה מלאה (25 ק\"ג)" }, category: "flour", unitOfMeasure: "kg", onHand: 320, reserved: 150, available: 170, minLevel: 300, maxLevel: 1000, status: "low" },
  { id: "rm3", sku: "RM-003", name: { en: "Fresh Yeast (500g)", he: "שמרים טריים (500 גרם)" }, category: "yeast", unitOfMeasure: "kg", onHand: 45, reserved: 10, available: 35, minLevel: 20, maxLevel: 100, status: "ok" },
  { id: "rm4", sku: "RM-004", name: { en: "Olive Oil (5L)", he: "שמן זית (5 ליטר)" }, category: "oil", unitOfMeasure: "L", onHand: 120, reserved: 30, available: 90, minLevel: 50, maxLevel: 300, status: "ok" },
  { id: "rm5", sku: "RM-005", name: { en: "Sea Salt (1kg)", he: "מלח ים (1 ק\"ג)" }, category: "seasoning", unitOfMeasure: "kg", onHand: 28, reserved: 5, available: 23, minLevel: 30, maxLevel: 100, status: "critical" },
  { id: "rm6", sku: "RM-006", name: { en: "Sesame Seeds (5kg)", he: "שומשום (5 ק\"ג)" }, category: "seeds", unitOfMeasure: "kg", onHand: 15, reserved: 8, available: 7, minLevel: 25, maxLevel: 80, status: "critical", isAllergen: true },
  { id: "rm7", sku: "RM-007", name: { en: "Sugar (25kg)", he: "סוכר (25 ק\"ג)" }, category: "sweetener", unitOfMeasure: "kg", onHand: 180, reserved: 20, available: 160, minLevel: 100, maxLevel: 500, status: "ok" },
  { id: "rm8", sku: "RM-008", name: { en: "Packaging Bags (1000)", he: "שקיות אריזה (1000)" }, category: "packaging", unitOfMeasure: "pcs", onHand: 4500, reserved: 1000, available: 3500, minLevel: 2000, maxLevel: 10000, status: "ok" },
];

const DUMMY_FINISHED_GOODS: InventoryItem[] = [
  { id: "fg1", sku: "PB-001", name: { en: "Classic Pita", he: "פיתה קלאסית" }, category: "pita", unitOfMeasure: "pcs", onHand: 1250, reserved: 400, available: 850, minLevel: 500, maxLevel: 3000, status: "ok", productionLine: "BAKERY" },
  { id: "fg2", sku: "PB-002", name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" }, category: "pita", unitOfMeasure: "pcs", onHand: 830, reserved: 350, available: 480, minLevel: 400, maxLevel: 2000, status: "ok", productionLine: "BAKERY" },
  { id: "fg3", sku: "PB-003", name: { en: "Mini Pita Pack (12)", he: "חבילת מיני פיתות (12)" }, category: "pita", unitOfMeasure: "packs", onHand: 420, reserved: 200, available: 220, minLevel: 200, maxLevel: 1000, status: "ok", productionLine: "BAKERY" },
  { id: "fg4", sku: "LB-001", name: { en: "Laffa Bread", he: "לחם לאפה" }, category: "flatbread", unitOfMeasure: "pcs", onHand: 180, reserved: 150, available: 30, minLevel: 200, maxLevel: 800, status: "critical", productionLine: "BAKERY" },
  { id: "fg5", sku: "SL-001", name: { en: "Mediterranean Salad", he: "סלט ים תיכוני" }, category: "salad", unitOfMeasure: "pcs", onHand: 145, reserved: 60, available: 85, minLevel: 80, maxLevel: 300, status: "ok", productionLine: "SALADS" },
  { id: "fg6", sku: "SL-002", name: { en: "Hummus Classic", he: "חומוס קלאסי" }, category: "dip", unitOfMeasure: "pcs", onHand: 95, reserved: 40, available: 55, minLevel: 100, maxLevel: 400, status: "low", productionLine: "SALADS" },
];

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
    const dummyData = tab === "raw_materials" ? DUMMY_RAW_MATERIALS : DUMMY_FINISHED_GOODS;
    try {
      const res = await fetch(`/api/inventory?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.length > 0 ? data : dummyData);
      } else {
        setItems(dummyData);
      }
    } catch {
      setItems(dummyData);
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
      hideOnMobile: true,
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
      hideOnMobile: true,
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("inventory.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/adjust`)}>
            <Plus className="me-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("inventory.adjustStock")}</span>
            <span className="sm:hidden">Adjust</span>
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/damage`)}>
            <Minus className="me-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("inventory.damageReport")}</span>
            <span className="sm:hidden">Damage</span>
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${locale}/inventory/movements`)}>
            <ArrowLeftRight className="me-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("inventory.movementHistory")}</span>
            <span className="sm:hidden">History</span>
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-center gap-2">
            <span className="text-2xl">{"\u{1F7E2}"}</span>
            <div className="text-center sm:text-start">
              <p className="text-2xl font-bold">{summary.ok}</p>
              <p className="text-sm text-muted-foreground">{t("inventory.statusOk")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-center gap-2">
            <span className="text-2xl">{"\u{1F7E1}"}</span>
            <div className="text-center sm:text-start">
              <p className="text-2xl font-bold">{summary.low}</p>
              <p className="text-sm text-muted-foreground">{t("inventory.statusLow")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-center gap-2">
            <span className="text-2xl">{"\u{1F534}"}</span>
            <div className="text-center sm:text-start">
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
