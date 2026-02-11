"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName, searchMultiLang } from "@/lib/utils/locale";

type Customer = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  defaultDeliverySlot: string | null;
  orderCutoffTime: string | null;
  paymentTerms: number;
  tags: string[];
  isActive: boolean;
};

export default function CustomersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) setCustomers(await res.json());
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: t("customers.name"),
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
      header: t("customers.contactName"),
      render: (row) => row.contactName || "—",
    },
    {
      key: "email",
      header: t("customers.email"),
      render: (row) => row.email || "—",
    },
    {
      key: "phone",
      header: t("customers.phone"),
      render: (row) => row.phone || "—",
    },
    {
      key: "defaultDeliverySlot",
      header: t("customers.defaultDeliverySlot"),
      render: (row) => row.defaultDeliverySlot || "—",
    },
    {
      key: "orderCutoffTime",
      header: t("customers.orderCutoffTime"),
      render: (row) => row.orderCutoffTime || "—",
    },
    {
      key: "tags",
      header: t("customers.tags"),
      render: (row) => {
        const tags = Array.isArray(row.tags) ? row.tags : [];
        return tags.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : "—";
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
        <h1 className="text-2xl font-bold">{t("customers.title")}</h1>
        <Button onClick={() => router.push(`/${locale}/customers/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t("customers.newCustomer")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("customers.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <DataTable
              data={customers}
              columns={columns}
              searchPlaceholder={`${t("common.search")} ${t("customers.title").toLowerCase()}...`}
              searchFn={(row, q) =>
                (row.shortName?.toLowerCase().includes(q) ?? false) ||
                searchMultiLang(row.name, q) ||
                (row.contactName?.toLowerCase().includes(q) ?? false) ||
                (row.email?.toLowerCase().includes(q) ?? false)
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
              onRowClick={(row) => router.push(`/${locale}/customers/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
