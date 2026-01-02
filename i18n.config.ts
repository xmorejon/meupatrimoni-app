import type {LocalePrefix} from 'next-intl/routing';

export const locales = ['en', 'es', 'ca'] as const;
export const defaultLocale = 'en';
export const localePrefix: LocalePrefix = 'always';
