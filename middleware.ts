import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only handle article routes
  if (pathname.startsWith("/articles/")) {
    const slug = pathname.replace("/articles/", "");

    // Ignore invalid paths like /articles or nested routes
    if (!slug || slug.includes("/")) {
      return NextResponse.next();
    }

    // Block direct .html access under /articles
    if (slug.endsWith(".html")) {
      return NextResponse.rewrite(new URL("/index.html", req.url));
    }

    // Static HTML location
    const staticPath = `/static_html_cache/${slug}.html`;
    const staticUrl = new URL(staticPath, req.url);

    try {
      // Check if static HTML exists
      const head = await fetch(staticUrl, { method: "HEAD" });

      if (head.ok) {
        // ✅ Serve static HTML
        return NextResponse.rewrite(staticUrl);
      }
    } catch (e) {
      // ignore and fallback
    }

    // ❌ Static not found → React → Supabase
    return NextResponse.rewrite(new URL("/index.html", req.url));
  }

  return NextResponse.next();
}
