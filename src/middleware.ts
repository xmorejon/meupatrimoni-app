import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'es', 'ca'],
  defaultLocale: 'en'
});
 
export const config = {
  matcher: ['/', '/(ca|es|en)/:path*']
};