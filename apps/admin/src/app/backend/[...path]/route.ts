import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiBase(): string {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3001";
  }
  const raw =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "API_URL is not set on this Vercel project (Runtime). Example: https://newgenloyalty.onrender.com",
    );
  }
  return raw.replace(/\/$/, "");
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path: segments = [] } = await ctx.params;
    const target = `${apiBase()}/${segments.join("/")}${req.nextUrl.search}`;

    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const authorization = req.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);
    const accept = req.headers.get("accept");
    if (accept) headers.set("accept", accept);
    // Oturum cihaz bilgisi için tarayıcının User-Agent'ı ve IP'si iletilir.
    // "Bu oturum" işareti için mevcut refresh token iletilir.
    const sessionToken = req.headers.get("x-session-token");
    if (sessionToken) headers.set("x-session-token", sessionToken);
    const userAgent = req.headers.get("user-agent");
    if (userAgent) headers.set("user-agent", userAgent);
    const forwardedFor =
      req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
    if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = Buffer.from(await req.arrayBuffer());
    }

    const upstream = await fetch(target, init);
    // Buffer the body — streaming + forwarded content-length breaks JSON on Vercel.
    const body = Buffer.from(await upstream.arrayBuffer());

    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) outHeaders.set("content-type", upstreamType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) outHeaders.set("content-disposition", disposition);

    return new NextResponse(body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
