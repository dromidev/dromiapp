import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isAdministratorHost,
  isEncuestaHost,
  isLocalDevAppHost,
  isMainMarketingHost,
} from "@/lib/hosts";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

function jwtRole(token: unknown): "client" | "superadmin" {
  const t = token as { role?: string } | null;
  return t?.role === "superadmin" ? "superadmin" : "client";
}

function isEncuestaPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return true;
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
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

function isAdminAppPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
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

  const adminHost = isAdministratorHost(host);
  const localDev = isLocalDevAppHost(host);
  const adminSurface = adminHost || localDev;

  const needsAuthGate =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    isAdminAppPath(pathname);

  const token =
    needsAuthGate && authSecret
      ? await getToken({ req: request, secret: authSecret })
      : null;

  const role = jwtRole(token);

  if (adminHost && (pathname === "/" || pathname === "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (isAdminAppPath(pathname)) {
    if (!adminSurface) {
      const adminOrigin =
        process.env.NEXT_PUBLIC_ADMINISTRADOR_ORIGIN ??
        "https://administrador.dromi.lat";
      try {
        const base = adminOrigin.endsWith("/")
          ? adminOrigin.slice(0, -1)
          : adminOrigin;
        const url = new URL(pathname + request.nextUrl.search, base);
        return NextResponse.redirect(url);
      } catch {
        return NextResponse.next();
      }
    }
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "superadmin") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "no_admin");
      loginUrl.searchParams.delete("callbackUrl");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (adminHost && isEncuestaPath(pathname) && !isAdminAppPath(pathname)) {
    if (pathname === "/register" || pathname.startsWith("/register/")) {
      const encuestaOrigin =
        process.env.NEXT_PUBLIC_ENCUESTA_ORIGIN ??
        "https://encuesta.dromi.lat";
      return NextResponse.redirect(
        new URL(
          pathname + request.nextUrl.search,
          encuestaOrigin.endsWith("/")
            ? encuestaOrigin.slice(0, -1)
            : encuestaOrigin
        )
      );
    }
  }

  if (adminHost && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (token) {
      if (adminHost && role === "superadmin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (adminHost && role !== "superadmin") {
        const encuestaOrigin =
          process.env.NEXT_PUBLIC_ENCUESTA_ORIGIN ??
          "https://encuesta.dromi.lat";
        try {
          const base = encuestaOrigin.endsWith("/")
            ? encuestaOrigin.slice(0, -1)
            : encuestaOrigin;
          return NextResponse.redirect(new URL("/dashboard", base));
        } catch {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
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
