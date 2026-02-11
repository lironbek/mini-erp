"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type Supplier = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  country: string;
  paymentTerms: number;
  leadTimeDays: number;
  deliveryDays: number[];
  rating: number | null;
  isActive: boolean;
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SuppliersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: t("suppliers.name"),
      sortable: true,
      accessor: (row) => row.shortName || getLocalizedName(row.name, locale),
      render: (row) => (
        <div>
          <span className="font-medium">
            {row.shortName || getLocalizedName(row.name, locale)}
          </span>
          {row.shortName && (
            <span className="text-sm text-muted-foreground block">
              {getLocalizedName(row.name, locale)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "contactName",
      header: t("suppliers.contactName"),
      render: (row) => row.contactName || "—",
    },
    {
      key: "phone",
      header: t("suppliers.phone"),
      render: (row) => row.phone || "—",
    },
    {
      key: "country",
      header: t("suppliers.country"),
      sortable: true,
    },
    {
      key: "paymentTerms",
      header: t("suppliers.paymentTerms"),
      sortable: true,
      render: (row) => `${row.paymentTerms}d`,
    },
    {
      key: "leadTimeDays",
      header: t("suppliers.leadTimeDays"),
      sortable: true,
      render: (row) => `${row.leadTimeDays}d`,
    },
    {
      key: "deliveryDays",
      header: t("suppliers.deliveryDays"),
      render: (row) => {
        const days = Array.isArray(row.deliveryDays) ? row.deliveryDays : [];
        return (
          <div className="flex gap-0.5">
            {dayLabels.map((label, idx) => (
              <span
                key={label}
                className={`text-xs px-1 py-0.5 rounded ${
                  days.includes(idx + 1)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label[0]}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "isActive",
      header: t("common.status"),
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "destructive"}>
          {row.isActive ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("suppliers.title")}</h1>
        <Button onClick={() => router.push(`/${locale}/procurement/suppliers/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t("suppliers.newSupplier")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("suppliers.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <DataTable
              data={suppliers}
              columns={columns}
              searchPlaceholder={`${t("common.search")} ${t("suppliers.title").toLowerCase()}...`}
              searchFn={(row, q) =>
                (row.shortName?.toLowerCase().includes(q) ?? false) ||
                searchMultiLang(row.name, q) ||
                (row.contactName?.toLowerCase().includes(q) ?? false)
              }
              filters={[
                {
                  key: "isActive",
                  label: t("common.status"),
                  options: [
                    { value: "true", label: t("common.active") },
                    { value: "false", label: t("common.inactive") },
                  ],
                },
              ]}
              onRowClick={(row) => router.push(`/${locale}/procurement/suppliers/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
