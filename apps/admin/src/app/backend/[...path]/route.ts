import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiBase(): string {
  const raw =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV !== "production"
      ? "http://localhost:3001"
      : "");
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
