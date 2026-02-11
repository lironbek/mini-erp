"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type CountItem = {
  id: string;
  itemType: string;
  rawMaterialId: string | null;
  productId: string | null;
  name: Record<string, string>;
  sku: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePct: number;
  varianceLevel: "low" | "medium" | "high";
  notes: string | null;
};

type InventoryCount = {
  id: string;
  countType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  countedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  items: CountItem[];
};

type CountListItem = {
  id: string;
  countType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  countedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  items: { id: string }[];
};

export default function StockCountPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [counts, setCounts] = useState<CountListItem[]>([]);
  const [activeCount, setActiveCount] = useState<InventoryCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [countType, setCountType] = useState("FULL");
  const [editedItems, setEditedItems] = useState<
    Record<string, { countedQuantity: number; notes: string }>
  >({});

  useEffect(() => {
    fetchCounts();
  }, []);

  async function fetchCounts() {
    try {
      const res = await fetch("/api/inventory/counts");
      if (res.ok) setCounts(await res.json());
    } catch {
      toast.error("Failed to load counts");
    } finally {
      setLoading(false);
    }
  }

  async function loadCount(id: string) {
    try {
      const res = await fetch(`/api/inventory/counts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data);
        const edits: Record<string, { countedQuantity: number; notes: string }> = {};
        data.items.forEach((item: CountItem) => {
          edits[item.id] = {
            countedQuantity: Number(item.countedQuantity),
            notes: item.notes || "",
          };
        });
        setEditedItems(edits);
      }
    } catch {
      toast.error("Failed to load count");
    }
  }

  async function handleStartCount() {
    setCreating(true);
    try {
      const res = await fetch("/api/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countType }),
      });
      if (res.ok) {
        const count = await res.json();
        toast.success("Count started");
        await fetchCounts();
        await loadCount(count.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start count");
      }
    } catch {
      toast.error("Failed to start count");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveCount() {
    if (!activeCount) return;
    setSaving(true);
    try {
      const items = Object.entries(editedItems).map(([id, data]) => ({
        id,
        countedQuantity: data.countedQuantity,
        notes: data.notes || null,
      }));

      const res = await fetch(`/api/inventory/counts/${activeCount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        toast.success("Count saved");
        await loadCount(activeCount.id);
      } else {
        toast.error("Failed to save count");
      }
    } catch {
      toast.error("Failed to save count");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitCount() {
    if (!activeCount) return;
    setSaving(true);
    try {
      const items = Object.entries(editedItems).map(([id, data]) => ({
        id,
        countedQuantity: data.countedQuantity,
        notes: data.notes || null,
      }));

      const res = await fetch(`/api/inventory/counts/${activeCount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, status: "completed" }),
      });

      if (res.ok) {
        toast.success("Count submitted for approval");
        await fetchCounts();
        await loadCount(activeCount.id);
      } else {
        toast.error("Failed to submit count");
      }
    } catch {
      toast.error("Failed to submit count");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!activeCount) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/inventory/counts/${activeCount.id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Count approved - inventory updated");
        await fetchCounts();
        await loadCount(activeCount.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve count");
    } finally {
      setApproving(false);
    }
  }

  const varianceColor: Record<string, string> = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  };

  const varianceBadge: Record<string, "default" | "secondary" | "destructive"> = {
    low: "secondary",
    medium: "default",
    high: "destructive",
  };

  const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    in_progress: "outline",
    completed: "default",
    approved: "secondary",
  };

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  // Active count detail view
  if (activeCount) {
    const isEditable = activeCount.status === "in_progress";
    const isApprovable = activeCount.status === "completed";
    const totalItems = activeCount.items.length;
    const varianceItems = activeCount.items.filter(
      (i) => Math.abs(i.variance) > 0.001
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveCount(null)}>
              <ClipboardList className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("stockCount.title")}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusBadge[activeCount.status] || "secondary"}>
                  {t(`stockCount.countStatuses.${activeCount.status}` as never)}
                </Badge>
                <Badge variant="outline">
                  {t(`stockCount.countTypes.${activeCount.countType.toLowerCase()}` as never)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(activeCount.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditable && (
              <>
                <Button variant="outline" onClick={handleSaveCount} disabled={saving}>
                  {t("common.save")}
                </Button>
                <Button onClick={handleSubmitCount} disabled={saving}>
                  {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Check className="me-1 h-4 w-4" />}
                  {t("stockCount.submitCount")}
                </Button>
              </>
            )}
            {isApprovable && (
              <Button onClick={handleApprove} disabled={approving}>
                {approving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Check className="me-1 h-4 w-4" />}
                {t("stockCount.approveCount")}
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-sm text-muted-foreground">{t("stockCount.itemsCounted")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-red-600">{varianceItems}</p>
              <p className="text-sm text-muted-foreground">{t("stockCount.variancesFound")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">
                {totalItems > 0
                  ? ((1 - varianceItems / totalItems) * 100).toFixed(1)
                  : "100"}
                %
              </p>
              <p className="text-sm text-muted-foreground">{t("stockCount.accuracy")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">
                {activeCount.items
                  .reduce((sum, i) => sum + Math.abs(i.variance), 0)
                  .toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">{t("stockCount.totalVarianceValue")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Count Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("stockCount.countSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-end">{t("stockCount.systemQty")}</TableHead>
                  <TableHead className="text-end">{t("stockCount.countedQty")}</TableHead>
                  <TableHead className="text-end">{t("stockCount.variance")}</TableHead>
                  <TableHead className="text-end">{t("stockCount.variancePercent")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCount.items.map((item) => {
                  const edited = editedItems[item.id];
                  const currentCounted = edited?.countedQuantity ?? item.countedQuantity;
                  const currentVariance = currentCounted - Number(item.systemQuantity);
                  const currentVariancePct =
                    Number(item.systemQuantity) > 0
                      ? Math.abs((currentVariance / Number(item.systemQuantity)) * 100)
                      : 0;
                  const level =
                    currentVariancePct > 5 ? "high" : currentVariancePct > 2 ? "medium" : "low";

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">
                        {getLocalizedName(item.name, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.itemType === "RAW_MATERIAL" ? "RM" : "FG"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        {Number(item.systemQuantity).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-end">
                        {isEditable ? (
                          <Input
                            type="number"
                            value={currentCounted}
                            onChange={(e) =>
                              setEditedItems({
                                ...editedItems,
                                [item.id]: {
                                  ...editedItems[item.id],
                                  countedQuantity: Number(e.target.value),
                                },
                              })
                            }
                            className="w-24 text-end ms-auto"
                            step="0.1"
                          />
                        ) : (
                          currentCounted.toFixed(1)
                        )}
                      </TableCell>
                      <TableCell className={`text-end font-medium ${varianceColor[level]}`}>
                        {currentVariance > 0 ? "+" : ""}
                        {currentVariance.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Badge variant={varianceBadge[level]}>
                          {currentVariancePct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditable ? (
                          <Input
                            value={edited?.notes || ""}
                            onChange={(e) =>
                              setEditedItems({
                                ...editedItems,
                                [item.id]: {
                                  ...editedItems[item.id],
                                  notes: e.target.value,
                                },
                              })
                            }
                            className="w-32"
                            placeholder={t("common.notes")}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {item.notes || "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Count list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("stockCount.title")}</h1>
        <div className="flex items-center gap-2">
          <Select value={countType} onValueChange={setCountType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL">{t("stockCount.countTypes.full")}</SelectItem>
              <SelectItem value="PARTIAL">{t("stockCount.countTypes.partial")}</SelectItem>
              <SelectItem value="SPOT_CHECK">{t("stockCount.countTypes.spotCheck")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleStartCount} disabled={creating}>
            {creating ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="me-1 h-4 w-4" />
            )}
            {t("stockCount.startCount")}
          </Button>
        </div>
      </div>

      {counts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("common.noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {counts.map((count) => (
            <Card
              key={count.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => loadCount(count.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge[count.status] || "secondary"}>
                          {t(`stockCount.countStatuses.${count.status}` as never)}
                        </Badge>
                        <Badge variant="outline">
                          {t(`stockCount.countTypes.${count.countType.toLowerCase()}` as never)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(count.createdAt).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm">
                      {count.items.length} {t("stockCount.itemsCounted").toLowerCase()}
                    </p>
                    {count.countedBy && (
                      <p className="text-xs text-muted-foreground">
                        {t("stockCount.countedBy")}: {count.countedBy.name}
                      </p>
                    )}
                    {count.approvedBy && (
                      <p className="text-xs text-muted-foreground">
                        {t("stockCount.approvedBy")}: {count.approvedBy.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
