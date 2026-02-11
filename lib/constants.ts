export const locales = ["en", "he", "zh-CN", "ms"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  he: "עברית",
  "zh-CN": "中文",
  ms: "Bahasa Melayu",
};

export const rtlLocales: Locale[] = ["he"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export type NavItem = {
  titleKey: string;
  href: string;
  icon: string;
  children?: NavItem[];
  roles?: string[];
};

export const navigation: NavItem[] = [
  {
    titleKey: "nav.dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    titleKey: "nav.orders",
    href: "/orders",
    icon: "ShoppingCart",
    roles: ["ADMIN", "MANAGER", "SALES", "PRODUCTION"],
    children: [
      {
        titleKey: "nav.allOrders",
        href: "/orders",
        icon: "ShoppingCart",
      },
      {
        titleKey: "nav.importReview",
        href: "/orders/import",
        icon: "Inbox",
        roles: ["ADMIN", "MANAGER", "SALES"],
      },
    ],
  },
  {
    titleKey: "nav.production",
    href: "/production",
    icon: "Factory",
    children: [
      { titleKey: "nav.dailyPlan", href: "/production/plan", icon: "Calendar" },
      {
        titleKey: "nav.workOrders",
        href: "/production/work-orders",
        icon: "ClipboardList",
      },
      {
        titleKey: "nav.floorReporting",
        href: "/production/report",
        icon: "FileText",
        roles: ["ADMIN", "MANAGER", "PRODUCTION"],
      },
      {
        titleKey: "nav.bomManagement",
        href: "/production/bom",
        icon: "GitBranch",
      },
    ],
  },
  {
    titleKey: "nav.inventory",
    href: "/inventory",
    icon: "Package",
    children: [
      {
        titleKey: "nav.rawMaterials",
        href: "/raw-materials",
        icon: "Wheat",
      },
      {
        titleKey: "nav.finishedGoods",
        href: "/inventory",
        icon: "PackageCheck",
      },
      {
        titleKey: "nav.stockCounts",
        href: "/inventory/count",
        icon: "ClipboardCheck",
      },
      {
        titleKey: "nav.goodsReceipt",
        href: "/inventory/receive",
        icon: "PackagePlus",
        roles: ["ADMIN", "MANAGER", "WAREHOUSE"],
      },
      {
        titleKey: "nav.movements",
        href: "/inventory/movements",
        icon: "ArrowLeftRight",
      },
    ],
  },
  {
    titleKey: "nav.procurement",
    href: "/procurement",
    icon: "Truck",
    children: [
      {
        titleKey: "nav.purchaseOrders",
        href: "/procurement",
        icon: "FileText",
      },
      {
        titleKey: "nav.suppliers",
        href: "/procurement/suppliers",
        icon: "Building2",
      },
      {
        titleKey: "nav.reorderSuggestions",
        href: "/procurement/suggestions",
        icon: "Lightbulb",
      },
      {
        titleKey: "nav.deliveryCalendar",
        href: "/procurement/calendar",
        icon: "CalendarDays",
      },
    ],
  },
  {
    titleKey: "nav.customers",
    href: "/customers",
    icon: "Users",
  },
  {
    titleKey: "nav.products",
    href: "/products",
    icon: "Box",
  },
  {
    titleKey: "nav.reports",
    href: "/reports",
    icon: "BarChart3",
    children: [
      {
        titleKey: "nav.profitability",
        href: "/reports/profitability",
        icon: "TrendingUp",
      },
      {
        titleKey: "nav.materialVariance",
        href: "/reports/material-variance",
        icon: "GitCompare",
      },
      {
        titleKey: "nav.productionAnalytics",
        href: "/reports/production",
        icon: "Activity",
      },
      {
        titleKey: "nav.wasteAnalysis",
        href: "/reports/waste",
        icon: "Trash2",
      },
    ],
    roles: ["ADMIN", "MANAGER"],
  },
  {
    titleKey: "nav.settings",
    href: "/settings",
    icon: "Settings",
    children: [
      {
        titleKey: "nav.systemSettings",
        href: "/settings",
        icon: "Sliders",
      },
      {
        titleKey: "nav.users",
        href: "/settings/users",
        icon: "UserCog",
      },
      {
        titleKey: "nav.integrations",
        href: "/settings/integrations",
        icon: "Plug",
      },
    ],
    roles: ["ADMIN"],
  },
];
