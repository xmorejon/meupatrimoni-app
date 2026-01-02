import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale, localePrefix} from '../i18n.config';
 
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
