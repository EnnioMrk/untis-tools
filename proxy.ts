import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const protectedRoutes = ["/dashboard", "/onboarding", "/timetable", "/premium", "/dev"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl));
  }

  // Redirect logged-in users away from auth pages
  if (nextUrl.pathname.startsWith("/auth/signin")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/timetable/:path*",
    "/premium/:path*",
    "/dev/:path*",
    "/auth/signin",
  ],
};
