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
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type ItemMapping = {
  xeroItemCode: string;
  internalRawMaterialId: string;
  internalSku: string;
};

type ContactMapping = {
  xeroContactId: string;
  xeroContactName: string;
  internalSupplierId: string;
  internalSupplierName: string;
};

type RawMaterial = {
  id: string;
  sku: string;
  name: Record<string, string>;
};

type Supplier = {
  id: string;
  name: Record<string, string>;
};

type XeroStatus = {
  connected: boolean;
  tenantId: string | null;
  tokenExpiry: string | null;
  lastInvoiceSync: string | null;
  lastContactSync: string | null;
  lastItemSync: string | null;
};

export default function XeroSettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [itemMappings, setItemMappings] = useState<ItemMapping[]>([]);
  const [contactMappings, setContactMappings] = useState<ContactMapping[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingInvoices, setSyncingInvoices] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncingItems, setSyncingItems] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, mapRes, rmRes, supRes] = await Promise.all([
        fetch("/api/integrations/xero/status"),
        fetch("/api/integrations/xero/mappings"),
        fetch("/api/raw-materials"),
        fetch("/api/procurement/suppliers"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (mapRes.ok) {
        const data = await mapRes.json();
        setItemMappings(data.itemMappings || []);
        setContactMappings(data.contactMappings || []);
      }
      if (rmRes.ok) {
        const data = await rmRes.json();
        setRawMaterials(Array.isArray(data) ? data : data.data || []);
      }
      if (supRes.ok) {
        const data = await supRes.json();
        setSuppliers(Array.isArray(data) ? data : data.data || []);
      }
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
    window.location.href = "/api/integrations/xero/auth";
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/integrations/xero/auth", { method: "DELETE" });
      if (res.ok) {
        toast.success("Disconnected from Xero");
        fetchData();
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/xero/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemMappings, contactMappings }),
      });
      if (res.ok) toast.success(t("xero.syncSuccess"));
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
      const res = await fetch("/api/integrations/xero/sync/invoices", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Invoices synced: ${data.processed} processed, ${data.unmapped} unmapped`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("xero.syncError"));
      }
    } catch {
      toast.error(t("xero.syncError"));
    } finally {
      setSyncingInvoices(false);
    }
  }

  async function handleSyncContacts() {
    setSyncingContacts(true);
    try {
      const res = await fetch("/api/integrations/xero/sync/contacts", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Contacts synced: ${data.synced} updated, ${data.newContacts} new`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("xero.syncError"));
      }
    } catch {
      toast.error(t("xero.syncError"));
    } finally {
      setSyncingContacts(false);
    }
  }

  async function handleSyncItems() {
    setSyncingItems(true);
    try {
      const res = await fetch("/api/integrations/xero/sync/items", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Items synced: ${data.updated} updated, ${data.priceChanges} price changes`
        );
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t("xero.syncError"));
      }
    } catch {
      toast.error(t("xero.syncError"));
    } finally {
      setSyncingItems(false);
    }
  }

  function addItemMapping() {
    setItemMappings([
      ...itemMappings,
      { xeroItemCode: "", internalRawMaterialId: "", internalSku: "" },
    ]);
  }

  function updateItemMapping(index: number, field: string, value: string) {
    const updated = [...itemMappings];
    const mapping = { ...updated[index], [field]: value };
    if (field === "internalRawMaterialId") {
      const rm = rawMaterials.find((r) => r.id === value);
      if (rm) mapping.internalSku = rm.sku;
    }
    updated[index] = mapping;
    setItemMappings(updated);
  }

  function removeItemMapping(index: number) {
    setItemMappings(itemMappings.filter((_, i) => i !== index));
  }

  function addContactMapping() {
    setContactMappings([
      ...contactMappings,
      { xeroContactId: "", xeroContactName: "", internalSupplierId: "", internalSupplierName: "" },
    ]);
  }

  function updateContactMapping(index: number, field: string, value: string) {
    const updated = [...contactMappings];
    const mapping = { ...updated[index], [field]: value };
    if (field === "internalSupplierId") {
      const sup = suppliers.find((s) => s.id === value);
      if (sup) mapping.internalSupplierName = getLocalizedName(sup.name, locale);
    }
    updated[index] = mapping;
    setContactMappings(updated);
  }

  function removeContactMapping(index: number) {
    setContactMappings(contactMappings.filter((_, i) => i !== index));
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("xero.title")}</h1>
        <div className="flex gap-2">
          {status?.connected ? (
            <Button variant="outline" onClick={handleDisconnect}>
              <Unlink className="me-1 h-4 w-4" />
              {t("xero.disconnect")}
            </Button>
          ) : (
            <Button onClick={handleConnect}>
              <Link className="me-1 h-4 w-4" />
              {t("xero.connect")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1 h-4 w-4" />
            )}
            {t("xero.saveSettings")}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("xero.connectionStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status?.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default">{t("xero.connected")}</Badge>
                {status.tokenExpiry && (
                  <span className="text-sm text-muted-foreground">
                    Token expires: {new Date(status.tokenExpiry).toLocaleString(locale)}
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <Badge variant="destructive">{t("xero.disconnected")}</Badge>
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
                {t("xero.invoiceSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("xero.lastSync")}:{" "}
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
                {t("xero.syncNow")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("xero.contactSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("xero.lastSync")}:{" "}
                {status.lastContactSync
                  ? new Date(status.lastContactSync).toLocaleString(locale)
                  : "Never"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncContacts}
                disabled={syncingContacts}
              >
                {syncingContacts ? (
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="me-1 h-3 w-3" />
                )}
                {t("xero.syncNow")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("xero.itemSync")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("xero.lastSync")}:{" "}
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
                {t("xero.syncNow")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Item Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("xero.itemMapping")}</CardTitle>
            <Button size="sm" onClick={addItemMapping}>
              <Plus className="me-1 h-4 w-4" />
              {t("xero.addMapping")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemMappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("xero.unmappedItems")} — {t("xero.addMapping")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("xero.xeroItemCode")}</TableHead>
                  <TableHead>{t("xero.internalSku")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemMappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={mapping.xeroItemCode}
                        onChange={(e) =>
                          updateItemMapping(idx, "xeroItemCode", e.target.value)
                        }
                        placeholder="XERO-ITEM-001"
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.internalRawMaterialId}
                        onValueChange={(v) =>
                          updateItemMapping(idx, "internalRawMaterialId", v)
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select raw material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map((rm) => (
                            <SelectItem key={rm.id} value={rm.id}>
                              {rm.sku} - {getLocalizedName(rm.name, locale)}
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

      {/* Contact Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("xero.contactMapping")}</CardTitle>
            <Button size="sm" onClick={addContactMapping}>
              <Plus className="me-1 h-4 w-4" />
              {t("xero.addMapping")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contactMappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("xero.unmappedItems")} — {t("xero.addMapping")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("xero.xeroContact")}</TableHead>
                  <TableHead>{t("xero.internalSupplier")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactMappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          value={mapping.xeroContactId}
                          onChange={(e) =>
                            updateContactMapping(idx, "xeroContactId", e.target.value)
                          }
                          placeholder="Xero Contact ID"
                          className="w-48"
                        />
                        <Input
                          value={mapping.xeroContactName}
                          onChange={(e) =>
                            updateContactMapping(idx, "xeroContactName", e.target.value)
                          }
                          placeholder="Contact Name"
                          className="w-48"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.internalSupplierId}
                        onValueChange={(v) =>
                          updateContactMapping(idx, "internalSupplierId", v)
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {getLocalizedName(s.name, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContactMapping(idx)}
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
