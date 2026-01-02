import createMiddleware from 'next-intl/middleware';
 
export const locales = ['en', 'es', 'ca'] as const;
export const defaultLocale = 'en';

export default createMiddleware({
  locales,
  defaultLocale
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
