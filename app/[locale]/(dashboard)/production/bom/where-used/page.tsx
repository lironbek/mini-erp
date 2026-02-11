"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Material = {
  id: string;
  sku: string;
  name: Record<string, string>;
};

type WhereUsedItem = {
  product: {
    id: string;
    sku: string;
    name: Record<string, string>;
    category: string | null;
    productionLine: string;
    sellingPrice: number | null;
  };
  quantity: number;
  unit: string;
  wastePercentage: number;
  standardBatchSize: number | null;
  batchUnit: string;
};

export default function WhereUsedPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [results, setResults] = useState<WhereUsedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then(setMaterials)
      .catch(() => {});
  }, []);

  async function fetchWhereUsed(materialId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/bom/where-used/${materialId}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(materialId: string) {
    setSelectedMaterial(materialId);
    fetchWhereUsed(materialId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("bom.whereUsed")}</h1>
      <p className="text-muted-foreground">{t("bom.whereUsedDescription")}</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("bom.selectMaterial")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label>{t("bom.selectMaterial")}</Label>
            <Select value={selectedMaterial} onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t("bom.selectMaterial")} />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.sku} — {getLocalizedName(m.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedMaterial && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("bom.usedInProducts")} ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground">{t("common.noResults")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products.sku")}</TableHead>
                    <TableHead>{t("products.name")}</TableHead>
                    <TableHead>{t("products.category")}</TableHead>
                    <TableHead>{t("bom.quantityPerBatch")}</TableHead>
                    <TableHead>{t("bom.wastePercentage")}</TableHead>
                    <TableHead>{t("bom.standardBatchSize")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">
                        {item.product.sku}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getLocalizedName(item.product.name, locale)}
                      </TableCell>
                      <TableCell>
                        {item.product.category ? (
                          <Badge variant="secondary">
                            {t(`products.categories.${item.product.category}` as never)}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {Number(item.quantity).toFixed(2)} {t(`units.${item.unit}` as never)}
                      </TableCell>
                      <TableCell>
                        {Number(item.wastePercentage)}%
                      </TableCell>
                      <TableCell>
                        {item.standardBatchSize
                          ? `${Number(item.standardBatchSize)} ${t(`units.${item.batchUnit}` as never)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
