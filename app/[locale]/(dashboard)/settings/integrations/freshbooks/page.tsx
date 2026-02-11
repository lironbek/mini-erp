"use client";

import { useState, useEffect, useCallback } from "react";
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
  Link,
  Unlink,
  FileText,
  Users,
  Package,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type ClientMapping = {
  freshbooksClientId: string;
  customerName: string;
  internalCustomerId: string;
};

type ItemMapping = {
  freshbooksItemName: string;
  productName: string;
  internalProductId: string;
};

type Customer = {
  id: string;
  name: Record<string, string>;
};

type Product = {
  id: string;
  sku: string;
  name: Record<string, string>;
};

type FreshbooksStatus = {
  connected: boolean;
  accountId: string | null;
  tokenExpiry: string | null;
  lastInvoiceSync: string | null;
  lastClientSync: string | null;
  lastItemSync: string | null;
  revenueCache: {
    lastUpdated: string;
    invoiceCount: number;
    totalRevenue: number;
    totalOutstanding: number;
  } | null;
};

type ARAgingSummary = {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinetyDays: number;
  totalOutstanding: number;
};

export default function FreshbooksSettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [status, setStatus] = useState<FreshbooksStatus | null>(null);
  const [clientMappings, setClientMappings] = useState<ClientMapping[]>([]);
  const [itemMappings, setItemMappings] = useState<ItemMapping[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [arAging, setArAging] = useState<ARAgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingInvoices, setSyncingInvoices] = useState(false);
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingItems, setSyncingItems] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, mapRes, custRes, prodRes, arRes] = await Promise.all([
        fetch("/api/integrations/freshbooks/status"),
        fetch("/api/integrations/freshbooks/mappings"),
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/integrations/freshbooks/revenue?type=ar-aging"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (mapRes.ok) {
        const data = await mapRes.json();
        setClientMappings(data.clientMappings || []);
        setItemMappings(data.itemMappings || []);
      }
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(Array.isArray(data) ? data : data.data || []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(Array.isArray(data) ? data : data.data || []);
      }
      if (arRes.ok) setArAging(await arRes.json());
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleConnect() {
    window.location.href = "/api/integrations/freshbooks/auth";
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/integrations/freshbooks/auth", { method: "DELETE" });
      if (res.ok) {
        toast.success("Disconnected from Freshbooks");
        fetchData();
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/freshbooks/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientMappings, itemMappings }),
      });
      if (res.ok) toast.success(t("freshbooks.syncSuccess"));
      else toast.error("Failed to save");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncInvoices() {
    setSyncingInvoices(true);
    try {
      const res = await fetch("/api/integrations/freshbooks/sync/invoices", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Invoices synced: ${data.processed} processed, ${data.unmappedClients} unmapped`
        );
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("freshbooks.syncError"));
      }
    } catch {
      toast.error(t("freshbooks.syncError"));
    } finally {
      setSyncingInvoices(false);
    }
  }

  async function handleSyncClients() {
    setSyncingClients(true);
    try {
      const res = await fetch("/api/integrations/freshbooks/sync/clients", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Clients synced: ${data.synced} updated, ${data.newClients} new`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("freshbooks.syncError"));
      }
    } catch {
      toast.error(t("freshbooks.syncError"));
    } finally {
      setSyncingClients(false);
    }
  }

  async function handleSyncItems() {
    setSyncingItems(true);
    try {
      const res = await fetch("/api/integrations/freshbooks/sync/items", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Items synced: ${data.updated} updated`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("freshbooks.syncError"));
      }
    } catch {
      toast.error(t("freshbooks.syncError"));
    } finally {
      setSyncingItems(false);
    }
  }

  function addClientMapping() {
    setClientMappings([
      ...clientMappings,
      { freshbooksClientId: "", customerName: "", internalCustomerId: "" },
    ]);
  }

  function updateClientMapping(index: number, field: string, value: string) {
    const updated = [...clientMappings];
    const mapping = { ...updated[index], [field]: value };
    if (field === "internalCustomerId") {
      const cust = customers.find((c) => c.id === value);
      if (cust) mapping.customerName = getLocalizedName(cust.name, locale);
    }
    updated[index] = mapping;
    setClientMappings(updated);
  }

  function removeClientMapping(index: number) {
    setClientMappings(clientMappings.filter((_, i) => i !== index));
  }

  function addItemMapping() {
    setItemMappings([
      ...itemMappings,
      { freshbooksItemName: "", productName: "", internalProductId: "" },
    ]);
  }

  function updateItemMapping(index: number, field: string, value: string) {
    const updated = [...itemMappings];
    const mapping = { ...updated[index], [field]: value };
    if (field === "internalProductId") {
      const prod = products.find((p) => p.id === value);
      if (prod) mapping.productName = getLocalizedName(prod.name, locale);
    }
    updated[index] = mapping;
    setItemMappings(updated);
  }

  function removeItemMapping(index: number) {
    setItemMappings(itemMappings.filter((_, i) => i !== index));
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "SGD" }).format(n);

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("freshbooks.title")}</h1>
        <div className="flex gap-2">
          {status?.connected ? (
            <Button variant="outline" onClick={handleDisconnect}>
              <Unlink className="me-1 h-4 w-4" />
              {t("freshbooks.disconnect")}
            </Button>
          ) : (
            <Button onClick={handleConnect}>
              <Link className="me-1 h-4 w-4" />
              {t("freshbooks.connect")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1 h-4 w-4" />
            )}
            {t("freshbooks.saveSettings")}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("freshbooks.connectionStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status?.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default">{t("freshbooks.connected")}</Badge>
                {status.tokenExpiry && (
                  <span className="text-sm text-muted-foreground">
                    Token expires: {new Date(status.tokenExpiry).toLocaleString(locale)}
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <Badge variant="destructive">{t("freshbooks.disconnected")}</Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Dashboard */}
      {status?.connected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("freshbooks.invoiceSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("freshbooks.lastSync")}:{" "}
                {status.lastInvoiceSync
                  ? new Date(status.lastInvoiceSync).toLocaleString(locale)
                  : "Never"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncInvoices}
                disabled={syncingInvoices}
              >
                {syncingInvoices ? (
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="me-1 h-3 w-3" />
                )}
                {t("freshbooks.syncNow")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("freshbooks.clientSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("freshbooks.lastSync")}:{" "}
                {status.lastClientSync
                  ? new Date(status.lastClientSync).toLocaleString(locale)
                  : "Never"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncClients}
                disabled={syncingClients}
              >
                {syncingClients ? (
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="me-1 h-3 w-3" />
                )}
                {t("freshbooks.syncNow")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("freshbooks.itemSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("freshbooks.lastSync")}:{" "}
                {status.lastItemSync
                  ? new Date(status.lastItemSync).toLocaleString(locale)
                  : "Never"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncItems}
                disabled={syncingItems}
              >
                {syncingItems ? (
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="me-1 h-3 w-3" />
                )}
                {t("freshbooks.syncNow")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AR Aging Summary */}
      {arAging && arAging.totalOutstanding > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("freshbooks.arAging")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{fmt(arAging.current)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.current")}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-600">{fmt(arAging.thirtyDays)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.thirtyDays")}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-600">{fmt(arAging.sixtyDays)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.sixtyDays")}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{fmt(arAging.ninetyDays)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.ninetyDays")}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-700">{fmt(arAging.overNinetyDays)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.overNinetyDays")}</p>
              </div>
              <div>
                <p className="text-lg font-bold">{fmt(arAging.totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground">{t("freshbooks.totalOutstanding")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Summary */}
      {status?.revenueCache && (
        <Card>
          <CardHeader>
            <CardTitle>{t("freshbooks.revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{status.revenueCache.invoiceCount}</p>
                <p className="text-sm text-muted-foreground">Invoices</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {fmt(status.revenueCache.totalRevenue)}
                </p>
                <p className="text-sm text-muted-foreground">{t("freshbooks.revenue")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {fmt(status.revenueCache.totalOutstanding)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("freshbooks.totalOutstanding")}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Last updated: {new Date(status.revenueCache.lastUpdated).toLocaleString(locale)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("freshbooks.clientMapping")}</CardTitle>
            <Button size="sm" onClick={addClientMapping}>
              <Plus className="me-1 h-4 w-4" />
              {t("freshbooks.addMapping")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientMappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("freshbooks.unmappedItems")} — {t("freshbooks.addMapping")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("freshbooks.freshbooksClient")}</TableHead>
                  <TableHead>{t("freshbooks.internalCustomer")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientMappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={mapping.freshbooksClientId}
                        onChange={(e) =>
                          updateClientMapping(idx, "freshbooksClientId", e.target.value)
                        }
                        placeholder="Freshbooks Client ID"
                        className="w-48"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.internalCustomerId}
                        onValueChange={(v) =>
                          updateClientMapping(idx, "internalCustomerId", v)
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {getLocalizedName(c.name, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClientMapping(idx)}
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

      {/* Item Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("freshbooks.itemMapping")}</CardTitle>
            <Button size="sm" onClick={addItemMapping}>
              <Plus className="me-1 h-4 w-4" />
              {t("freshbooks.addMapping")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemMappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("freshbooks.unmappedItems")} — {t("freshbooks.addMapping")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("freshbooks.freshbooksItem")}</TableHead>
                  <TableHead>{t("freshbooks.internalProduct")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemMappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={mapping.freshbooksItemName}
                        onChange={(e) =>
                          updateItemMapping(idx, "freshbooksItemName", e.target.value)
                        }
                        placeholder="Item name"
                        className="w-48"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.internalProductId}
                        onValueChange={(v) =>
                          updateItemMapping(idx, "internalProductId", v)
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItemMapping(idx)}
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
    </div>
  );
}
