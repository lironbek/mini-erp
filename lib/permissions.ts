export type Role = "ADMIN" | "MANAGER" | "PRODUCTION" | "WAREHOUSE" | "SALES" | "VIEWER";

type Permission = "view" | "create" | "edit" | "delete" | "manage";

type RoutePermission = {
  path: string;
  roles: Role[];
  permission?: Permission;
};

export const routePermissions: RoutePermission[] = [
  // Dashboard
  { path: "/", roles: ["ADMIN", "MANAGER", "PRODUCTION", "WAREHOUSE", "SALES", "VIEWER"] },
  { path: "/reports/profitability", roles: ["ADMIN", "MANAGER"] },
  { path: "/reports", roles: ["ADMIN", "MANAGER"] },

  // Orders
  { path: "/orders", roles: ["ADMIN", "MANAGER", "SALES", "PRODUCTION"] },

  // Production
  { path: "/production", roles: ["ADMIN", "MANAGER", "PRODUCTION"] },
  { path: "/production/plan", roles: ["ADMIN", "MANAGER", "PRODUCTION"] },
  { path: "/production/work-orders", roles: ["ADMIN", "MANAGER", "PRODUCTION"] },
  { path: "/production/report", roles: ["ADMIN", "MANAGER", "PRODUCTION"] },
  { path: "/production/bom", roles: ["ADMIN", "MANAGER"] },

  // Inventory
  { path: "/inventory", roles: ["ADMIN", "MANAGER", "PRODUCTION", "WAREHOUSE"] },
  { path: "/inventory/receive", roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { path: "/inventory/adjust", roles: ["ADMIN", "MANAGER"] },
  { path: "/inventory/count", roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { path: "/inventory/movements", roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { path: "/inventory/damage", roles: ["ADMIN", "MANAGER", "WAREHOUSE", "PRODUCTION"] },
  { path: "/raw-materials", roles: ["ADMIN", "MANAGER", "PRODUCTION", "WAREHOUSE"] },

  // Procurement
  { path: "/procurement", roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { path: "/procurement/suppliers", roles: ["ADMIN", "MANAGER"] },
  { path: "/procurement/suggestions", roles: ["ADMIN", "MANAGER"] },
  { path: "/procurement/calendar", roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },

  // Customers
  { path: "/customers", roles: ["ADMIN", "MANAGER", "SALES"] },

  // Products
  { path: "/products", roles: ["ADMIN", "MANAGER"] },

  // Settings
  { path: "/settings", roles: ["ADMIN"] },
  { path: "/settings/users", roles: ["ADMIN"] },
  { path: "/settings/integrations", roles: ["ADMIN"] },
];

export function hasPermission(userRole: string, pathname: string): boolean {
  // Admin always has access
  if (userRole === "ADMIN") return true;

  // Find the most specific matching route
  const matchingRoutes = routePermissions
    .filter((rp) => pathname === rp.path || pathname.startsWith(rp.path + "/"))
    .sort((a, b) => b.path.length - a.path.length);

  if (matchingRoutes.length === 0) {
    // No specific permission defined - allow access
    return true;
  }

  const bestMatch = matchingRoutes[0];
  return bestMatch.roles.includes(userRole as Role);
}

export function getNavItemsForRole(role: string): string[] {
  return routePermissions
    .filter((rp) => rp.roles.includes(role as Role))
    .map((rp) => rp.path);
}
