import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/passive',
]);

const CASHIER_ALLOWED = new Set(['/counter', '/']);

function pathAllowedForCashier(pathname: string): boolean {
  if (CASHIER_ALLOWED.has(pathname)) return true;
  return pathname.startsWith('/counter');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/backend') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Pasif hesap: oturum çerezi olsa bile panel sayfaları /passive'e gider
  if (request.cookies.get('ngl_passive')?.value && pathname !== '/passive') {
    return NextResponse.redirect(new URL('/passive', request.url));
  }

  const session = request.cookies.get('ngl_session')?.value;
  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  let role: string | null = null;
  let subscription: string | null = null;
  try {
    const parsed = JSON.parse(decodeURIComponent(session)) as {
      role?: string;
      subscription?: string;
    };
    role = parsed.role ?? null;
    subscription = parsed.subscription ?? null;
  } catch {
    const login = new URL('/login', request.url);
    return NextResponse.redirect(login);
  }

  if (role === 'CASHIER' && !pathAllowedForCashier(pathname)) {
    return NextResponse.redirect(new URL('/counter', request.url));
  }

  if (
    subscription === 'SUSPENDED' &&
    !pathname.startsWith('/settings/billing') &&
    pathname !== '/login'
  ) {
    return NextResponse.redirect(new URL('/settings/billing', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
