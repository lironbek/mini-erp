"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  MessageSquare,
  Check,
  X,
  Edit,
  Loader2,
  Inbox,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type ParsedOrder = {
  id: string;
  orderNumber: string;
  source: string;
  sourceReference: string | null;
  status: string;
  aiParsedRaw: string | null;
  aiConfidence: number | null;
  createdAt: string;
  requestedDeliveryDate: string | null;
  customer: { id: string; name: Record<string, string>; shortName: string | null } | null;
  items: {
    id: string;
    quantity: number;
    unit: string;
    product: { id: string; sku: string; name: Record<string, string> };
  }[];
};

export default function OrderImportPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [manualParse, setManualParse] = useState(false);
  const [parseForm, setParseForm] = useState({
    source: "EMAIL",
    subject: "",
    message: "",
    from: "",
  });
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders/import?status=DRAFT");
      if (res.ok) setOrders(await res.json());
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(orderId: string, action: "accept" | "reject") {
    setProcessing(orderId);
    try {
      const res = await fetch("/api/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId }),
      });
      if (res.ok) {
        toast.success(action === "accept" ? "Order confirmed" : "Order rejected");
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to ${action} order`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleManualParse() {
    if (!parseForm.message.trim()) {
      toast.error("Please enter a message to parse");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/orders/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseForm),
      });
      if (res.ok) {
        toast.success("Message parsed - check results below");
        setManualParse(false);
        setParseForm({ source: "EMAIL", subject: "", message: "", from: "" });
        await fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to parse");
      }
    } catch {
      toast.error("Failed to parse message");
    } finally {
      setParsing(false);
    }
  }

  function getConfidenceColor(confidence: number | null): string {
    if (!confidence) return "text-muted-foreground";
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  }

  function getConfidenceLabel(confidence: number | null): string {
    if (!confidence) return "—";
    if (confidence >= 0.9) return t("aiParser.highConfidence");
    if (confidence >= 0.7) return t("aiParser.mediumConfidence");
    return t("aiParser.lowConfidence");
  }

  function getConfidenceBadge(
    confidence: number | null
  ): "default" | "secondary" | "destructive" {
    if (!confidence) return "secondary";
    if (confidence >= 0.9) return "default";
    if (confidence >= 0.7) return "secondary";
    return "destructive";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("aiParser.reviewQueue")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManualParse(!manualParse)}>
            <Send className="me-1 h-4 w-4" />
            {manualParse ? t("common.cancel") : "Parse New Message"}
          </Button>
        </div>
      </div>

      {/* Manual Parse Form */}
      {manualParse && (
        <Card>
          <CardHeader>
            <CardTitle>Parse Order Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("aiParser.source")}</label>
                <Select
                  value={parseForm.source}
                  onValueChange={(v) => setParseForm({ ...parseForm, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">
                      <span className="flex items-center gap-2">
                        <Mail className="h-3 w-3" /> Email
                      </span>
                    </SelectItem>
                    <SelectItem value="WHATSAPP">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" /> WhatsApp
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {parseForm.source === "EMAIL" ? (
                <div>
                  <label className="text-sm font-medium">{t("aiParser.emailSubject")}</label>
                  <Input
                    value={parseForm.subject}
                    onChange={(e) => setParseForm({ ...parseForm, subject: e.target.value })}
                    placeholder="Order for Wednesday"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">{t("aiParser.whatsappFrom")}</label>
                  <Input
                    value={parseForm.from}
                    onChange={(e) => setParseForm({ ...parseForm, from: e.target.value })}
                    placeholder="+65..."
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t("aiParser.originalMessage")}</label>
              <Textarea
                value={parseForm.message}
                onChange={(e) => setParseForm({ ...parseForm, message: e.target.value })}
                rows={6}
                placeholder="Paste the order email or WhatsApp message here..."
              />
            </div>
            <Button onClick={handleManualParse} disabled={parsing}>
              {parsing ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-1 h-4 w-4" />
              )}
              {t("aiParser.parsingInProgress")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders Queue */}
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-xl text-muted-foreground">{t("aiParser.noOrdersToReview")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const parsed = order.aiParsedRaw ? JSON.parse(order.aiParsedRaw) : null;
            const confidence = order.aiConfidence ? Number(order.aiConfidence) : null;

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {order.source === "EMAIL" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.sourceReference || order.source} •{" "}
                          {new Date(order.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {confidence !== null && (
                        <Badge variant={getConfidenceBadge(confidence)}>
                          <span className={getConfidenceColor(confidence)}>
                            {(confidence * 100).toFixed(0)}%
                          </span>{" "}
                          {getConfidenceLabel(confidence)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Original Message */}
                    {parsed && (
                      <div>
                        <p className="text-sm font-medium mb-2">{t("aiParser.originalMessage")}</p>
                        <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {parsed.rawText || "—"}
                        </div>
                      </div>
                    )}

                    {/* Parsed Result */}
                    <div>
                      <p className="text-sm font-medium mb-2">{t("aiParser.parsedResult")}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("aiParser.customer")}:</span>
                          <span className="font-medium">
                            {order.customer
                              ? order.customer.shortName || getLocalizedName(order.customer.name, locale)
                              : "—"}
                          </span>
                          {parsed?.customerMatch && (
                            <Badge variant={getConfidenceBadge(parsed.customerMatch.confidence)} className="text-xs">
                              {(parsed.customerMatch.confidence * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("aiParser.deliveryDate")}:</span>
                          <span className="font-medium">
                            {order.requestedDeliveryDate
                              ? new Date(order.requestedDeliveryDate).toLocaleDateString(locale)
                              : "—"}
                          </span>
                          {parsed?.deliveryDate && (
                            <Badge variant={getConfidenceBadge(parsed.deliveryDate.confidence)} className="text-xs">
                              {(parsed.deliveryDate.confidence * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>

                        {/* Items */}
                        {order.items.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("aiParser.items")}</TableHead>
                                <TableHead className="text-end">{t("aiParser.quantity")}</TableHead>
                                <TableHead>{t("aiParser.confidence")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items.map((item, idx) => {
                                const parsedItem = parsed?.items?.[idx];
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <span className="font-mono text-xs">{item.product.sku}</span>{" "}
                                      {getLocalizedName(item.product.name, locale)}
                                    </TableCell>
                                    <TableCell className="text-end">{Number(item.quantity)}</TableCell>
                                    <TableCell>
                                      {parsedItem?.productMatch && (
                                        <Badge
                                          variant={getConfidenceBadge(parsedItem.productMatch.confidence)}
                                          className="text-xs"
                                        >
                                          {(parsedItem.productMatch.confidence * 100).toFixed(0)}%
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}

                        {parsed?.specialInstructions && (
                          <div>
                            <span className="text-sm text-muted-foreground">
                              {t("aiParser.specialInstructions")}:
                            </span>
                            <p className="text-sm mt-1">{parsed.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${locale}/orders/${order.id}`)}
                    >
                      <Edit className="me-1 h-4 w-4" />
                      {t("aiParser.editAndAccept")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleAction(order.id, "reject")}
                      disabled={processing === order.id}
                    >
                      <X className="me-1 h-4 w-4" />
                      {t("aiParser.reject")}
                    </Button>
                    <Button
                      onClick={() => handleAction(order.id, "accept")}
                      disabled={processing === order.id}
                    >
                      {processing === order.id ? (
                        <Loader2 className="me-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="me-1 h-4 w-4" />
                      )}
                      {t("aiParser.accept")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
