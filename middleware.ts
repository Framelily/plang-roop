import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from './i18n/config';

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  // If no locale cookie, use default locale (English)
  if (!localeCookie) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  }

  // Validate existing cookie
  if (!locales.includes(localeCookie as Locale)) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
