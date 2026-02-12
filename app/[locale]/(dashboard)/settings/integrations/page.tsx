"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const integrations = [
  {
    titleKey: "xero.title",
    descKey: "xero.description",
    href: "/settings/integrations/xero",
    logo: "Xero",
  },
  {
    titleKey: "freshbooks.title",
    descKey: "freshbooks.description",
    href: "/settings/integrations/freshbooks",
    logo: "FreshBooks",
  },
  {
    titleKey: "ariba.title",
    descKey: "ariba.description",
    href: "/settings/integrations/ariba",
    logo: "Ariba",
  },
];

export default function IntegrationsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("integrations.title")}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t(item.titleKey)}</CardTitle>
                <Badge variant="secondary">
                  {t("integrations.disconnected")}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(item.descKey)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
