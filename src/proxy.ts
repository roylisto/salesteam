import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "salesteam_session";

/** Routes that do not require a session. */
const PUBLIC_ROUTES = ["/", "/login", "/register"];

const LOGIN_ROUTE = "/login";
const HOME_ROUTE = "/dashboard";

/**
 * Optimistic auth guard. Only inspects the session cookie — the authoritative
 * check lives in the data access layer (`requireUser`). This keeps the proxy
 * fast since it runs on every request, including prefetches.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (!isPublic && !hasSession) {
    const url = new URL(LOGIN_ROUTE, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isPublic && hasSession && pathname !== HOME_ROUTE) {
    return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
