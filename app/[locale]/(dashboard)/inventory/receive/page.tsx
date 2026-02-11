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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Loader2, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type PO = {
  id: string;
  poNumber: string;
  supplier: { id: string; name: Record<string, string>; shortName: string | null };
  status: string;
  expectedDeliveryDate: string | null;
};

type POItem = {
  id: string;
  rawMaterial: {
    id: string;
    sku: string;
    name: Record<string, string>;
    unitOfMeasure: string;
  };
  quantityOrdered: number;
  quantityReceived: number;
  remaining: number;
  unit: string;
  unitPrice: number | null;
};

type Supplier = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
};

type RawMaterial = {
  id: string;
  sku: string;
  name: Record<string, string>;
  unitOfMeasure: string;
};

type ReceiveLineItem = {
  rawMaterialId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  damagedQty: number;
  damageReason: string;
};

export default function GoodsReceiptPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState("po");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PO Receipt state
  const [openPOs, setOpenPOs] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [poReceiveQtys, setPOReceiveQtys] = useState<
    Record<string, { received: number; damaged: number; damageReason: string }>
  >({});

  // Manual Receipt state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [manualSupplier, setManualSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [manualItems, setManualItems] = useState<ReceiveLineItem[]>([]);

  useEffect(() => {
    fetchOpenPOs();
    fetchSuppliersMaterials();
  }, []);

  async function fetchOpenPOs() {
    try {
      const res = await fetch("/api/procurement/purchase-orders");
      if (res.ok) {
        const all = await res.json();
        setOpenPOs(
          all.filter((po: PO) =>
            ["sent", "confirmed", "partially_received"].includes(po.status)
          )
        );
      }
    } catch {
      toast.error("Failed to load POs");
    }
  }

  async function fetchSuppliersMaterials() {
    try {
      const [supRes, matRes] = await Promise.all([
        fetch("/api/suppliers?active=true"),
        fetch("/api/raw-materials"),
      ]);
      if (supRes.ok) setSuppliers(await supRes.json());
      if (matRes.ok) setMaterials(await matRes.json());
    } catch {
      // silently fail
    }
  }

  async function handlePOSelect(poId: string) {
    setSelectedPO(poId);
    if (!poId) {
      setPOItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/receive/from-po/${poId}`);
      if (res.ok) {
        const data = await res.json();
        setPOItems(data.items);
        const qtys: Record<string, { received: number; damaged: number; damageReason: string }> =
          {};
        data.items.forEach((item: POItem) => {
          qtys[item.id] = {
            received: item.remaining,
            damaged: 0,
            damageReason: "",
          };
        });
        setPOReceiveQtys(qtys);
      }
    } catch {
      toast.error("Failed to load PO items");
    } finally {
      setLoading(false);
    }
  }

  async function handlePOSubmit() {
    if (!selectedPO) return;
    setSubmitting(true);
    try {
      const items = poItems
        .filter((item) => {
          const q = poReceiveQtys[item.id];
          return q && (q.received > 0 || q.damaged > 0);
        })
        .map((item) => {
          const q = poReceiveQtys[item.id];
          return {
            poItemId: item.id,
            receivedQuantity: q.received,
            damagedQuantity: q.damaged,
            damageReason: q.damageReason || undefined,
          };
        });

      const res = await fetch(
        `/api/procurement/purchase-orders/${selectedPO}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }
      );

      if (res.ok) {
        toast.success(t("goodsReceipt.receiptSuccess"));
        setSelectedPO("");
        setPOItems([]);
        fetchOpenPOs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit receipt");
      }
    } catch {
      toast.error("Failed to submit receipt");
    } finally {
      setSubmitting(false);
    }
  }

  function addManualItem() {
    setManualItems([
      ...manualItems,
      {
        rawMaterialId: "",
        name: "",
        sku: "",
        unit: "KG",
        quantity: 0,
        damagedQty: 0,
        damageReason: "",
      },
    ]);
  }

  function updateManualItem(index: number, field: string, value: string | number) {
    const items = [...manualItems];
    const item = { ...items[index], [field]: value };
    if (field === "rawMaterialId") {
      const mat = materials.find((m) => m.id === value);
      if (mat) {
        item.sku = mat.sku;
        item.name = getLocalizedName(mat.name, locale);
        item.unit = mat.unitOfMeasure;
      }
    }
    items[index] = item;
    setManualItems(items);
  }

  function removeManualItem(index: number) {
    setManualItems(manualItems.filter((_, i) => i !== index));
  }

  async function handleManualSubmit() {
    if (manualItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: manualSupplier || null,
          invoiceNumber: invoiceNumber || null,
          items: manualItems.map((item) => ({
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unit: item.unit,
            damagedQty: item.damagedQty || 0,
            damageReason: item.damageReason || null,
          })),
        }),
      });

      if (res.ok) {
        toast.success(t("goodsReceipt.receiptSuccess"));
        setManualItems([]);
        setInvoiceNumber("");
        setManualSupplier("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit receipt");
      }
    } catch {
      toast.error("Failed to submit receipt");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("goodsReceipt.title")}</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="po">{t("goodsReceipt.receiveAgainstPo")}</TabsTrigger>
          <TabsTrigger value="manual">{t("goodsReceipt.manualReceipt")}</TabsTrigger>
        </TabsList>

        {/* Receive Against PO */}
        <TabsContent value="po" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("goodsReceipt.selectPo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPO} onValueChange={handlePOSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t("goodsReceipt.openPurchaseOrders")} />
                </SelectTrigger>
                <SelectContent>
                  {openPOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.poNumber} —{" "}
                      {po.supplier.shortName ||
                        getLocalizedName(po.supplier.name, locale)}
                      {po.expectedDeliveryDate && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({new Date(po.expectedDeliveryDate).toLocaleDateString()})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
              ) : poItems.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>{t("goodsReceipt.expectedItems")}</TableHead>
                        <TableHead className="text-end">Ordered</TableHead>
                        <TableHead className="text-end">Already Received</TableHead>
                        <TableHead className="text-end">Remaining</TableHead>
                        <TableHead className="text-end">{t("goodsReceipt.receivedQty")}</TableHead>
                        <TableHead className="text-end">{t("goodsReceipt.damageQty")}</TableHead>
                        <TableHead>{t("goodsReceipt.damageReason")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item) => {
                        const q = poReceiveQtys[item.id];
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.rawMaterial.sku}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getLocalizedName(item.rawMaterial.name, locale)}
                            </TableCell>
                            <TableCell className="text-end">
                              {item.quantityOrdered.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-end text-green-600">
                              {item.quantityReceived.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-end font-medium">
                              {item.remaining.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-end">
                              <Input
                                type="number"
                                value={q?.received ?? 0}
                                onChange={(e) =>
                                  setPOReceiveQtys({
                                    ...poReceiveQtys,
                                    [item.id]: {
                                      ...q,
                                      received: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-24 text-end ms-auto"
                                step="0.1"
                                max={item.remaining}
                              />
                            </TableCell>
                            <TableCell className="text-end">
                              <Input
                                type="number"
                                value={q?.damaged ?? 0}
                                onChange={(e) =>
                                  setPOReceiveQtys({
                                    ...poReceiveQtys,
                                    [item.id]: {
                                      ...q,
                                      damaged: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-24 text-end ms-auto"
                                step="0.1"
                                min={0}
                              />
                            </TableCell>
                            <TableCell>
                              {(q?.damaged ?? 0) > 0 && (
                                <Select
                                  value={q?.damageReason || ""}
                                  onValueChange={(v) =>
                                    setPOReceiveQtys({
                                      ...poReceiveQtys,
                                      [item.id]: { ...q, damageReason: v },
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-36">
                                    <SelectValue placeholder={t("goodsReceipt.damageReason")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {["damaged", "wrongItem", "shortDelivery", "qualityIssue", "expired", "other"].map(
                                      (reason) => (
                                        <SelectItem key={reason} value={reason}>
                                          {t(`goodsReceipt.damageReasons.${reason}` as never)}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button onClick={handlePOSubmit} disabled={submitting}>
                      {submitting ? (
                        <Loader2 className="me-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="me-1 h-4 w-4" />
                      )}
                      {t("goodsReceipt.submitReceipt")}
                    </Button>
                  </div>
                </>
              ) : selectedPO ? (
                <p className="text-muted-foreground text-center py-8">
                  {t("common.noResults")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Receipt */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("goodsReceipt.manualReceipt")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("goodsReceipt.selectSupplier")}</label>
                  <Select value={manualSupplier} onValueChange={setManualSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("goodsReceipt.selectSupplier")} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.shortName || getLocalizedName(s.name, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("goodsReceipt.invoiceNumber")}</label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder={t("goodsReceipt.invoiceNumber")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t("procurement.items")}</h3>
                <Button size="sm" onClick={addManualItem}>
                  <Plus className="me-1 h-4 w-4" />
                  {t("goodsReceipt.addMoreItems")}
                </Button>
              </div>

              {manualItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">{t("procurement.material")}</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-end">{t("goodsReceipt.receivedQty")}</TableHead>
                      <TableHead className="text-end">{t("goodsReceipt.damageQty")}</TableHead>
                      <TableHead>{t("goodsReceipt.damageReason")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={item.rawMaterialId}
                            onValueChange={(v) => updateManualItem(idx, "rawMaterialId", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("procurement.material")} />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.sku} - {getLocalizedName(m.name, locale)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.unit}</TableCell>
                        <TableCell className="text-end">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateManualItem(idx, "quantity", Number(e.target.value))
                            }
                            className="w-24 text-end ms-auto"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-end">
                          <Input
                            type="number"
                            value={item.damagedQty}
                            onChange={(e) =>
                              updateManualItem(idx, "damagedQty", Number(e.target.value))
                            }
                            className="w-24 text-end ms-auto"
                            step="0.1"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          {item.damagedQty > 0 && (
                            <Select
                              value={item.damageReason}
                              onValueChange={(v) => updateManualItem(idx, "damageReason", v)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder={t("goodsReceipt.damageReason")} />
                              </SelectTrigger>
                              <SelectContent>
                                {["damaged", "wrongItem", "shortDelivery", "qualityIssue", "expired", "other"].map(
                                  (reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {t(`goodsReceipt.damageReasons.${reason}` as never)}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeManualItem(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {manualItems.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={handleManualSubmit} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="me-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="me-1 h-4 w-4" />
                    )}
                    {t("goodsReceipt.submitReceipt")}
                  </Button>
                </div>
              )}

              {manualItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("goodsReceipt.addMoreItems")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
