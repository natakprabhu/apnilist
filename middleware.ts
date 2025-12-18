import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only handle article pages
  if (pathname.startsWith("/articles/")) {
    const slug = pathname.replace("/articles/", "");

    // Ignore invalid paths
    if (!slug || slug.includes("/")) {
      return NextResponse.next();
    }

    const staticUrl = new URL(
      `/static_html_cache/${slug}.html`,
      req.url
    );

    // IMPORTANT: use GET, not HEAD
    return fetch(staticUrl)
      .then((res) => {
        if (res.ok) {
          // ✅ Serve static HTML with 200
          return NextResponse.rewrite(staticUrl, { status: 200 });
        }

        // ❌ Static missing → SPA
        return NextResponse.rewrite(
          new URL("/index.html", req.url),
          { status: 200 }
        );
      })
      .catch(() =>
        NextResponse.rewrite(
          new URL("/index.html", req.url),
          { status: 200 }
        )
      );
  }

  return NextResponse.next();
}

// 🔥 FORCE middleware to run on articles
export const config = {
  matcher: ["/articles/:path*"],
};
