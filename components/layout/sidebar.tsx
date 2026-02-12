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
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <div className="mt-1 space-y-0.5">
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200",
        pathname === item.href &&
          "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-primary-glow"
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
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sidebar-primary/5 to-transparent" />
      <div className="flex h-14 items-center px-4 relative z-10">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-sidebar-foreground group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 shadow-lg shadow-sidebar-primary/25 transition-shadow duration-300 group-hover:shadow-sidebar-primary/40">
            <Factory className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg tracking-tight">Mini ERP</span>
        </Link>
      </div>
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 relative z-10">
        {navigation.map((item) => (
          <NavItemComponent
            key={item.href + item.titleKey}
            item={item}
            pathname={pathname}
            t={t}
          />
        ))}
      </nav>
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      <div className="p-4 text-xs text-sidebar-foreground/30 relative z-10">
        <span className="opacity-60">Esemby Concept</span>
        <span className="mx-1.5 text-sidebar-foreground/15">/</span>
        <span className="opacity-40">Pita Bakery</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-e lg:border-sidebar-border lg:bg-sidebar">
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
      <SheetContent side="right" className="w-64 p-0">
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
