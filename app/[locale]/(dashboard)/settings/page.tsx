"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Bell, Plug } from "lucide-react";

const settingsCards = [
  {
    titleKey: "nav.users",
    descKey: "settings.usersDesc",
    href: "/settings/users",
    icon: UserCog,
  },
  {
    titleKey: "nav.notifications",
    descKey: "settings.notificationsDesc",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    titleKey: "nav.integrations",
    descKey: "settings.integrationsDesc",
    href: "/settings/integrations",
    icon: Plug,
  },
];

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{t(card.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(card.descKey)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
