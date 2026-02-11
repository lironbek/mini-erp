"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Copy,
  AlertTriangle,
  Clock,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Product = {
  id: string;
  sku: string;
  name: Record<string, string>;
  sellingPrice: number | null;
};

type Customer = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
  defaultDeliverySlot: string | null;
  orderCutoffTime: string | null;
};

type OrderItem = {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
};

type OrderChange = {
  id: string;
  changeType: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  changedBy: { name: string } | null;
  createdAt: string;
};

const STATUSES = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "LOCKED",
  "IN_PRODUCTION",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

export default function OrderFormPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [changes, setChanges] = useState<OrderChange[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const [form, setForm] = useState({
    customerId: "",
    source: "MANUAL",
    status: "PENDING",
    orderDate: new Date().toISOString().slice(0, 10),
    requestedDeliveryDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    confirmedDeliveryDate: "",
    deliverySlot: "",
    deliveryNotes: "",
    internalNotes: "",
    items: [] as OrderItem[],
    lockedAt: null as string | null,
    lockedBy: null as { name: string } | null,
    orderNumber: "",
    isAnomaly: false,
  });

  const fetchData = useCallback(async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers?active=true"),
        fetch("/api/products?active=true"),
      ]);
      if (custRes.ok) setCustomers(await custRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());

      if (!isNew) {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const order = await res.json();
          setForm({
            customerId: order.customerId,
            source: order.source,
            status: order.status,
            orderDate: order.orderDate?.slice(0, 10) || "",
            requestedDeliveryDate: order.requestedDeliveryDate?.slice(0, 10) || "",
            confirmedDeliveryDate: order.confirmedDeliveryDate?.slice(0, 10) || "",
            deliverySlot: order.deliverySlot || "",
            deliveryNotes: order.deliveryNotes || "",
            internalNotes: order.internalNotes || "",
            items: order.items.map((item: OrderItem & { product: Product }) => ({
              id: item.id,
              productId: item.productId,
              product: item.product,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice || 0),
              totalPrice: Number(item.totalPrice || 0),
              notes: item.notes || "",
            })),
            lockedAt: order.lockedAt,
            lockedBy: order.lockedBy,
            orderNumber: order.orderNumber,
            isAnomaly: false,
          });
          setChanges(order.changes || []);
        }
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLocked = !!form.lockedAt;
  const subtotal = form.items.reduce((sum, item) => sum + item.totalPrice, 0);

  function addItem() {
    setForm({
      ...form,
      items: [
        ...form.items,
        { productId: "", quantity: 1, unitPrice: 0, totalPrice: 0, notes: "" },
      ],
    });
  }

  function updateItem(index: number, field: string, value: string | number) {
    const items = [...form.items];
    const item = { ...items[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.unitPrice = Number(product.sellingPrice || 0);
        item.totalPrice = item.quantity * item.unitPrice;
        item.product = product;
      }
    }
    if (field === "quantity" || field === "unitPrice") {
      item.totalPrice = Number(item.quantity) * Number(item.unitPrice);
    }
    items[index] = item;
    setForm({ ...form, items });
  }

  function removeItem(index: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    if (!form.customerId || form.items.length === 0) {
      toast.error("Please select a customer and add items");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: form.customerId,
        source: form.source,
        status: form.status,
        orderDate: form.orderDate,
        requestedDeliveryDate: form.requestedDeliveryDate,
        confirmedDeliveryDate: form.confirmedDeliveryDate || null,
        deliverySlot: form.deliverySlot || null,
        deliveryNotes: form.deliveryNotes || null,
        internalNotes: form.internalNotes || null,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || null,
        })),
      };

      const res = isNew
        ? await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        const order = await res.json();
        toast.success(isNew ? "Order created" : "Order updated");
        if (isNew) {
          router.push(`/${locale}/orders/${order.id}`);
        } else {
          fetchData();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status changed to ${newStatus}`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to change status");
      }
    } catch {
      toast.error("Failed to change status");
    }
    setShowStatusDialog(false);
  }

  async function handleLockToggle() {
    const action = isLocked ? "unlock" : "lock";
    try {
      const res = await fetch(`/api/orders/${id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(isLocked ? "Order unlocked" : "Order locked");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed");
      }
    } catch {
      toast.error("Failed");
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/orders/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const newOrder = await res.json();
        toast.success("Order duplicated");
        router.push(`/${locale}/orders/${newOrder.id}`);
      }
    } catch {
      toast.error("Failed to duplicate");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted");
        router.push(`/${locale}/orders`);
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/orders`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? t("orders.newOrder") : form.orderNumber}
            </h1>
            {!isNew && (
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    (
                      ({
                        DRAFT: "secondary",
                        PENDING: "outline",
                        CONFIRMED: "default",
                        LOCKED: "destructive",
                        CANCELLED: "destructive",
                      } as Record<string, "default" | "secondary" | "destructive" | "outline">)
                    )[form.status] || "default"
                  }
                >
                  {t(`orders.orderStatuses.${form.status}` as never)}
                </Badge>
                {isLocked && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {form.lockedBy?.name}
                  </span>
                )}
                {form.isAnomaly && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t("orders.anomalyDetected")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="me-1 h-4 w-4" />
                {t("orders.duplicateOrder")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLockToggle}>
                {isLocked ? (
                  <>
                    <Unlock className="me-1 h-4 w-4" />
                    {t("orders.unlockOrder")}
                  </>
                ) : (
                  <>
                    <Lock className="me-1 h-4 w-4" />
                    {t("orders.lockOrder")}
                  </>
                )}
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={saving || isLocked}>
            <Save className="me-1 h-4 w-4" />
            {isNew ? t("common.create") : t("common.save")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t("orders.orderDetails")}</TabsTrigger>
          {!isNew && <TabsTrigger value="history">{t("orders.changeHistory")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-4">
          {/* Status workflow */}
          {!isNew && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => {
                    const isCurrent = form.status === s;
                    const isPast = STATUSES.indexOf(s) < STATUSES.indexOf(form.status);
                    return (
                      <Button
                        key={s}
                        variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}
                        size="sm"
                        disabled={isCurrent || s === "CANCELLED"}
                        onClick={() => {
                          setPendingStatus(s);
                          setShowStatusDialog(true);
                        }}
                      >
                        {t(`orders.orderStatuses.${s}` as never)}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("orders.orderDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("orders.customer")} *</label>
                  <Select
                    value={form.customerId}
                    onValueChange={(v) => {
                      const cust = customers.find((c) => c.id === v);
                      setForm({
                        ...form,
                        customerId: v,
                        deliverySlot: cust?.defaultDeliverySlot || form.deliverySlot,
                      });
                    }}
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("orders.customer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.shortName || getLocalizedName(c.name, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">{t("orders.source")}</label>
                  <Select
                    value={form.source}
                    onValueChange={(v) => setForm({ ...form, source: v })}
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["MANUAL", "EMAIL", "WHATSAPP", "ARIBA", "PORTAL"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`orders.orderSources.${s}` as never)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t("orders.orderDate")}</label>
                    <Input
                      type="date"
                      value={form.orderDate}
                      onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("orders.requestedDeliveryDate")} *</label>
                    <Input
                      type="date"
                      value={form.requestedDeliveryDate}
                      onChange={(e) => setForm({ ...form, requestedDeliveryDate: e.target.value })}
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t("orders.deliverySlot")}</label>
                  <Input
                    value={form.deliverySlot}
                    onChange={(e) => setForm({ ...form, deliverySlot: e.target.value })}
                    placeholder="06:00-08:00"
                    disabled={isLocked}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("common.notes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("orders.deliveryNotes")}</label>
                  <Textarea
                    value={form.deliveryNotes}
                    onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
                    rows={3}
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("orders.internalNotes")}</label>
                  <Textarea
                    value={form.internalNotes}
                    onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                    rows={3}
                    disabled={isLocked}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("orders.items")}</CardTitle>
                <Button size="sm" onClick={addItem} disabled={isLocked}>
                  <Plus className="me-1 h-4 w-4" />
                  {t("orders.addItem")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">{t("orders.product")}</TableHead>
                    <TableHead>{t("orders.quantity")}</TableHead>
                    <TableHead>{t("orders.unitPrice")}</TableHead>
                    <TableHead>{t("orders.totalPrice")}</TableHead>
                    <TableHead>{t("common.notes")}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={item.productId}
                          onValueChange={(v) => updateItem(idx, "productId", v)}
                          disabled={isLocked}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("orders.product")} />
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
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-24"
                          min={1}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                          className="w-28"
                          step="0.01"
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItem(idx, "notes", e.target.value)}
                          placeholder={t("common.notes")}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          disabled={isLocked}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {form.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 pe-4">
                <div className="text-end">
                  <p className="text-sm text-muted-foreground">{t("orders.subtotal")}</p>
                  <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNew && (
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t("orders.changeHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t("orders.noChanges")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {changes.map((change) => (
                      <div key={change.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{change.changeType}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {change.changedBy?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(change.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {change.reason && (
                            <p className="text-sm mt-1">{change.reason}</p>
                          )}
                          {change.oldValue && change.newValue && (
                            <div className="text-xs mt-1 text-muted-foreground">
                              {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete + Status dialogs */}
      {!isNew && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLocked}
          >
            <Trash2 className="me-1 h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("common.confirm")}
        description={t("orders.confirmDelete")}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={t("orders.confirmStatusChange")}
        description={`${form.status} → ${pendingStatus}`}
        onConfirm={() => handleStatusChange(pendingStatus)}
      />
    </div>
  );
}
