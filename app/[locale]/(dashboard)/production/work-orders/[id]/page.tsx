"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Play, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type WorkOrder = {
  id: string;
  woNumber: string;
  productionDate: string;
  productionLine: string;
  status: string;
  actualStart: string | null;
  actualEnd: string | null;
  notes: string | null;
  createdBy: { name: string } | null;
  items: {
    id: string;
    product: { sku: string; name: Record<string, string>; shelfLifeDays: number };
    plannedQuantity: number;
    producedQuantity: number;
    wasteQuantity: number;
    batchNumber: string | null;
    status: string;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function WorkOrderDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWo = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/work-orders/${id}`);
      if (res.ok) setWo(await res.json());
    } catch {
      toast.error("Failed to load work order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWo();
  }, [fetchWo]);

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/production/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status changed to ${newStatus}`);
        fetchWo();
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (loading || !wo) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  const totalPlanned = wo.items.reduce((s, i) => s + Number(i.plannedQuantity), 0);
  const totalProduced = wo.items.reduce((s, i) => s + Number(i.producedQuantity), 0);
  const totalWaste = wo.items.reduce((s, i) => s + Number(i.wasteQuantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/production/work-orders`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{wo.woNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[wo.status]}`}>
                {t(`production.woStatuses.${wo.status}` as never)}
              </span>
              <Badge variant="outline">
                {t(`products.productionLines.${wo.productionLine}` as never)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(wo.productionDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {wo.status === "planned" && (
            <Button onClick={() => handleStatusChange("in_progress")}>
              <Play className="me-1 h-4 w-4" />
              {t("production.startProduction")}
            </Button>
          )}
          {wo.status === "in_progress" && (
            <>
              <Button onClick={() => handleStatusChange("completed")}>
                <CheckCircle className="me-1 h-4 w-4" />
                {t("production.completeProduction")}
              </Button>
              <Button variant="destructive" onClick={() => handleStatusChange("cancelled")}>
                <XCircle className="me-1 h-4 w-4" />
                {t("production.cancelWorkOrder")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{totalPlanned}</p>
            <p className="text-sm text-muted-foreground">{t("production.plannedQty")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalProduced}</p>
            <p className="text-sm text-muted-foreground">{t("production.producedQty")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{totalWaste}</p>
            <p className="text-sm text-muted-foreground">{t("production.wasteQty")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t("production.items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-end">{t("production.plannedQty")}</TableHead>
                <TableHead className="text-end">{t("production.producedQty")}</TableHead>
                <TableHead className="text-end">{t("production.wasteQty")}</TableHead>
                <TableHead>{t("production.batchNumber")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wo.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{item.product.sku}</span>
                    <p className="font-medium">{getLocalizedName(item.product.name, locale)}</p>
                  </TableCell>
                  <TableCell className="text-end">{Number(item.plannedQuantity)}</TableCell>
                  <TableCell className="text-end font-medium text-green-600">
                    {Number(item.producedQuantity)}
                  </TableCell>
                  <TableCell className="text-end text-red-600">
                    {Number(item.wasteQuantity)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.batchNumber || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[item.status] || ""
                      }`}
                    >
                      {t(`production.woItemStatuses.${item.status}` as never)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>Created by: {wo.createdBy?.name || "System"}</p>
            {wo.actualStart && <p>Started: {new Date(wo.actualStart).toLocaleString()}</p>}
            {wo.actualEnd && <p>Completed: {new Date(wo.actualEnd).toLocaleString()}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
