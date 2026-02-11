"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Package,
  Truck,
  Users,
  Box,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  Calendar,
  ClipboardList,
  FileText,
  GitBranch,
  Wheat,
  PackageCheck,
  ClipboardCheck,
  ArrowLeftRight,
  Building2,
  Lightbulb,
  CalendarDays,
  TrendingUp,
  GitCompare,
  Activity,
  Trash2,
  Sliders,
  UserCog,
  Plug,
} from "lucide-react";
import { navigation, type NavItem } from "@/lib/constants";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Package,
  Truck,
  Users,
  Box,
  BarChart3,
  Settings,
  Calendar,
  ClipboardList,
  FileText,
  GitBranch,
  Wheat,
  PackageCheck,
  ClipboardCheck,
  ArrowLeftRight,
  Building2,
  Lightbulb,
  CalendarDays,
  TrendingUp,
  GitCompare,
  Activity,
  Trash2,
  Sliders,
  UserCog,
  Plug,
};

function NavItemComponent({
  item,
  pathname,
  t,
  level = 0,
}: {
  item: NavItem;
  pathname: string;
  t: (key: string) => string;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = iconMap[item.icon];
  const isActive =
    pathname === item.href ||
    (item.children?.some((child) => pathname === child.href) ?? false);
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent/50 text-accent-foreground font-medium"
          )}
          style={{ paddingInlineStart: `${level * 12 + 12}px` }}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 text-start">{t(item.titleKey)}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                pathname={pathname}
                t={t}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        pathname === item.href &&
          "bg-primary text-primary-foreground font-medium"
      )}
      style={{ paddingInlineStart: `${level * 12 + 12}px` }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{t(item.titleKey)}</span>
    </Link>
  );
}

function SidebarContent() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Factory className="h-6 w-6" />
          <span>Mini ERP</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => (
          <NavItemComponent
            key={item.href + item.titleKey}
            item={item}
            pathname={pathname}
            t={t}
          />
        ))}
      </nav>
      <Separator />
      <div className="p-4 text-xs text-muted-foreground">
        Esemby Concept / Pita Bakery
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-e lg:bg-card">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
