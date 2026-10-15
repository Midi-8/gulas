import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames, excluding static assets, admin and api
  matcher: ['/((?!api|_next|_vercel|images|admin|test|favicon.ico|.*\\..*).*)'],
};
