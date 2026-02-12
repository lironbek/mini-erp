"use client";

import { useTranslations, useLocale } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { MobileSidebar } from "./sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      <MobileSidebar />

      <div className="flex-1" />

      <NotificationCenter />

      <LanguageSwitcher />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 group">
            <Avatar className="h-7 w-7 ring-2 ring-primary/20 transition-all duration-200 group-hover:ring-primary/40">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user?.name || "User"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm">
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            {user?.role && (
              <p className="text-xs text-muted-foreground capitalize">
                {t(`users.roles.${user.role.toLowerCase()}`)}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="me-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: `/${locale}/login` })}>
            <LogOut className="me-2 h-4 w-4" />
            {t("auth.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
