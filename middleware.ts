import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuth = !!token;
  const { pathname } = request.nextUrl;
  
  const isAuthPage = pathname.startsWith("/auth");
  const isPendingPage = pathname === "/pending-approval";
  const isProtectedPage = 
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/org-admin") ||
    pathname.startsWith("/contests");

  // Check account status and redirect pending users
  if (isAuth && token.accountStatus === "pending" && !isPendingPage && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/signout")) {
    return NextResponse.redirect(new URL("/pending-approval", request.url));
  }

  // Redirect rejected/suspended users to signin
  if (isAuth && (token.accountStatus === "rejected" || token.accountStatus === "suspended") && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  if (isAuthPage) {
    if (isAuth && token.accountStatus === "approved") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return null;
  }

  if (!isAuth && isProtectedPage) {
    let from = pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/auth/signin?from=${encodeURIComponent(from)}`, request.url)
    );
  }

  return null;
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/teacher/:path*", "/org-admin/:path*", "/contests/:path*", "/auth/:path*", "/pending-approval"],
};
