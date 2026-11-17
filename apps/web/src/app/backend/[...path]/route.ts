import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedBackendProxy,
  PROXY_MAX_BODY_BYTES,
  browserCacheControlForProxyPath,
} from "@/lib/backend-proxy-allowlist";

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
      "API_URL is not set (Vercel → Environment → Runtime). Example: https://newgenloyalty.onrender.com",
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

    if (!isAllowedBackendProxy(req.method, segments)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const path = segments.join("/");
    const search = req.method === "GET" || req.method === "HEAD" ? req.nextUrl.search : "";
    const target = `${apiBase()}/${path}${search}`;

    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const accept = req.headers.get("accept");
    if (accept) headers.set("accept", accept);

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const buf = Buffer.from(await req.arrayBuffer());
      if (buf.byteLength > PROXY_MAX_BODY_BYTES) {
        return NextResponse.json(
          { message: "Payload too large" },
          { status: 413 },
        );
      }
      init.body = buf;
    }

    const upstream = await fetch(target, init);
    const body = Buffer.from(await upstream.arrayBuffer());

    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) outHeaders.set("content-type", upstreamType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) outHeaders.set("content-disposition", disposition);
    const browserCache =
      req.method === "GET" || req.method === "HEAD"
        ? browserCacheControlForProxyPath(path)
        : null;
    const upstreamCache = upstream.headers.get("cache-control");
    if (browserCache) {
      outHeaders.set("Cache-Control", upstreamCache || browserCache);
    } else {
      outHeaders.set("Cache-Control", "no-store");
    }
    const etag = upstream.headers.get("etag");
    if (etag) outHeaders.set("etag", etag);

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
export const HEAD = proxy;
export const POST = proxy;
