"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import {
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type ItemMapping = {
  aribaItemCode: string;
  internalProductId: string;
  internalSku: string;
  uomConversion: number;
};

type Product = {
  id: string;
  sku: string;
  name: Record<string, string>;
};

type AribaStatus = {
  configured: boolean;
  lastSync: string | null;
  lastResult: {
    imported: number;
    pendingMapping: number;
    errors: number;
    timestamp: string;
    totalPOs: number;
  } | null;
};

export default function AribaSettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [mappings, setMappings] = useState<ItemMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<AribaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [mapRes, prodRes, statusRes] = await Promise.all([
        fetch("/api/integrations/ariba/mappings"),
        fetch("/api/products"),
        fetch("/api/integrations/ariba/status"),
      ]);
      if (mapRes.ok) setMappings(await mapRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/ariba/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappings),
      });
      if (res.ok) toast.success("Mappings saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/ariba/sync", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Sync complete: ${data.imported} imported, ${data.pendingMapping} pending, ${data.errors} errors`
        );
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  function addMapping() {
    setMappings([
      ...mappings,
      { aribaItemCode: "", internalProductId: "", internalSku: "", uomConversion: 1 },
    ]);
  }

  function updateMapping(index: number, field: string, value: string | number) {
    const updated = [...mappings];
    const mapping = { ...updated[index], [field]: value };
    if (field === "internalProductId") {
      const prod = products.find((p) => p.id === value);
      if (prod) mapping.internalSku = prod.sku;
    }
    updated[index] = mapping;
    setMappings(updated);
  }

  function removeMapping(index: number) {
    setMappings(mappings.filter((_, i) => i !== index));
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("ariba.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="me-1 h-4 w-4" />
            )}
            {t("ariba.syncNow")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1 h-4 w-4" />
            )}
            {t("ariba.saveSettings")}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("ariba.connectionStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {status?.configured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="default">{t("ariba.connected")}</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <Badge variant="destructive">{t("ariba.disconnected")}</Badge>
                </>
              )}
            </div>
            {status?.lastResult && (
              <div className="text-sm text-muted-foreground">
                {t("ariba.lastSync")}:{" "}
                {new Date(status.lastResult.timestamp).toLocaleString(locale)} •{" "}
                {status.lastResult.imported} {t("ariba.ordersImported")} •{" "}
                {status.lastResult.pendingMapping} {t("ariba.pendingMapping")} •{" "}
                {status.lastResult.errors} {t("ariba.errorsFound")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Item Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("ariba.itemMapping")}</CardTitle>
            <Button size="sm" onClick={addMapping}>
              <Plus className="me-1 h-4 w-4" />
              {t("ariba.addMapping")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No mappings configured. Add mappings to link Ariba item codes to internal products.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ariba.aribaItemCode")}</TableHead>
                  <TableHead>{t("ariba.internalSku")}</TableHead>
                  <TableHead>{t("ariba.uomConversion")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={mapping.aribaItemCode}
                        onChange={(e) =>
                          updateMapping(idx, "aribaItemCode", e.target.value)
                        }
                        placeholder="ARIBA-001"
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.internalProductId}
                        onValueChange={(v) =>
                          updateMapping(idx, "internalProductId", v)
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.sku} - {getLocalizedName(p.name, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={mapping.uomConversion}
                        onChange={(e) =>
                          updateMapping(idx, "uomConversion", Number(e.target.value))
                        }
                        className="w-24"
                        step="0.01"
                        min={0.01}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMapping(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {status?.lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ariba.syncHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{status.lastResult.totalPOs}</p>
                <p className="text-sm text-muted-foreground">Total POs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {status.lastResult.imported}
                </p>
                <p className="text-sm text-muted-foreground">{t("ariba.ordersImported")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {status.lastResult.pendingMapping}
                </p>
                <p className="text-sm text-muted-foreground">{t("ariba.pendingMapping")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {status.lastResult.errors}
                </p>
                <p className="text-sm text-muted-foreground">{t("ariba.errorsFound")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
