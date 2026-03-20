import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isEncuestaHost, isMainMarketingHost } from "@/lib/hosts";

function isEncuestaPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return true;
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/votar" ||
    pathname.startsWith("/votar/") ||
    pathname === "/proyeccion" ||
    pathname.startsWith("/proyeccion/")
  ) {
    return true;
  }
  return false;
}

function isStaticOrNext(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (isStaticOrNext(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const encuesta = isEncuestaHost(host);
  const main = isMainMarketingHost(host);

  if (encuesta && !main) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (!isEncuestaPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (main && encuesta) {
    if (isEncuestaPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (isEncuestaPath(pathname)) {
    const encuestaOrigin =
      process.env.NEXT_PUBLIC_ENCUESTA_ORIGIN ?? "https://encuesta.dromi.lat";
    try {
      const url = new URL(pathname + request.nextUrl.search, encuestaOrigin);
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
