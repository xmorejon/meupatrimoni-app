import {notFound} from 'next/navigation';
import {getLocale, getRequestConfig} from 'next-intl/server';
 
const locales = ['en', 'es', 'ca'];
 
export default getRequestConfig(async () => {
  const locale = await getLocale();
  if (!locales.includes(locale as any)) notFound();
 
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});