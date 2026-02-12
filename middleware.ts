import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicPages = ["/login"];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Find locale in the pathname
  const locale = routing.locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );

  // Get path without locale prefix
  const pathnameWithoutLocale = locale
    ? pathname.slice(`/${locale}`.length) || "/"
    : pathname;

  const isPublicPage = publicPages.some(
    (page) => pathnameWithoutLocale === page
  );

  // Check for auth token
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const resolvedLocale = locale || routing.defaultLocale;

  // Not authenticated and not on public page → redirect to login
  if (!token && !isPublicPage) {
    return NextResponse.redirect(
      new URL(`/${resolvedLocale}/login`, request.url)
    );
  }

  // Authenticated and on login page → redirect to dashboard
  if (token && isPublicPage) {
    return NextResponse.redirect(
      new URL(`/${resolvedLocale}`, request.url)
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", "/"],
};
