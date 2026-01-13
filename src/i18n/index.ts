import { env } from '../env';
import { en } from './en';
import { fi, type Translations } from './fi';

export type Language = 'fi' | 'en';

const translations: Record<Language, Translations> = { fi, en };

export const t = (lang: Language = env.DEFAULT_LANGUAGE): Translations => translations[lang];

export type { Translations };
