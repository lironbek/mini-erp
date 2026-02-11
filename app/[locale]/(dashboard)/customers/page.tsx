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

const DUMMY_CUSTOMERS: Customer[] = [
  { id: "c1", name: { en: "Freshmart Supermarket", he: "פרשמרט סופרמרקט" }, shortName: "Freshmart", contactName: "John Lee", email: "orders@freshmart.sg", phone: "+65 6234 5678", defaultDeliverySlot: "06:00-08:00", orderCutoffTime: "18:00", paymentTerms: 30, tags: ["retail", "priority"], isActive: true },
  { id: "c2", name: { en: "Cafe Aroma Chain", he: "רשת קפה ארומה" }, shortName: "Cafe Aroma", contactName: "Sarah Chen", email: "procurement@cafearoma.com", phone: "+65 6345 6789", defaultDeliverySlot: "05:00-07:00", orderCutoffTime: "16:00", paymentTerms: 14, tags: ["cafe", "chain"], isActive: true },
  { id: "c3", name: { en: "City Deli & Bistro", he: "סיטי דלי וביסטרו" }, shortName: "City Deli", contactName: "Michael Tan", email: "mike@citydeli.sg", phone: "+65 6456 7890", defaultDeliverySlot: "07:00-09:00", orderCutoffTime: "17:00", paymentTerms: 14, tags: ["restaurant"], isActive: true },
  { id: "c4", name: { en: "Green Garden Restaurant", he: "מסעדת הגן הירוק" }, shortName: "Green Garden", contactName: "Lisa Wong", email: "lisa@greengarden.sg", phone: "+65 6567 8901", defaultDeliverySlot: "08:00-10:00", orderCutoffTime: "19:00", paymentTerms: 7, tags: ["restaurant", "organic"], isActive: true },
  { id: "c5", name: { en: "Hummus House", he: "בית החומוס" }, shortName: "Hummus House", contactName: "David Levy", email: "david@hummushouse.sg", phone: "+65 6678 9012", defaultDeliverySlot: "06:00-08:00", orderCutoffTime: "17:00", paymentTerms: 30, tags: ["restaurant", "priority"], isActive: true },
  { id: "c6", name: { en: "Baker's Corner", he: "פינת האופה" }, shortName: null, contactName: "Amy Koh", email: "amy@bakerscorner.sg", phone: "+65 6789 0123", defaultDeliverySlot: "09:00-11:00", orderCutoffTime: "20:00", paymentTerms: 7, tags: ["retail"], isActive: true },
  { id: "c7", name: { en: "Marina Bay Hotel", he: "מלון מרינה ביי" }, shortName: "MB Hotel", contactName: "Robert Chang", email: "f&b@mbhotel.sg", phone: "+65 6890 1234", defaultDeliverySlot: "05:00-06:00", orderCutoffTime: "15:00", paymentTerms: 45, tags: ["hotel", "premium"], isActive: true },
  { id: "c8", name: { en: "Sunrise Bakery", he: "מאפיית הזריחה" }, shortName: null, contactName: "Jenny Lim", email: "jenny@sunrise.sg", phone: "+65 6901 2345", defaultDeliverySlot: null, orderCutoffTime: null, paymentTerms: 30, tags: [], isActive: false },
];

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
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.length > 0 ? data : DUMMY_CUSTOMERS);
      } else {
        setCustomers(DUMMY_CUSTOMERS);
      }
    } catch {
      setCustomers(DUMMY_CUSTOMERS);
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
      hideOnMobile: true,
      render: (row) => row.defaultDeliverySlot || "—",
    },
    {
      key: "orderCutoffTime",
      header: t("customers.orderCutoffTime"),
      hideOnMobile: true,
      render: (row) => row.orderCutoffTime || "—",
    },
    {
      key: "tags",
      header: t("customers.tags"),
      hideOnMobile: true,
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("customers.title")}</h1>
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
