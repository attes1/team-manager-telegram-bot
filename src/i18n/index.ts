import type { Kysely } from 'kysely';
import { env } from '../env';
import { languageSchema } from '../lib/schemas';
import { getConfig } from '../services/config';
import type { DB } from '../types/db';
import { en } from './en';
import { fi, type Translations } from './fi';

export type Language = 'fi' | 'en';

const translations: Record<Language, Translations> = { fi, en };

export const t = (lang: Language = env.DEFAULT_LANGUAGE): Translations => translations[lang];

export const getTranslations = async (db: Kysely<DB>, seasonId?: number): Promise<Translations> => {
  if (!seasonId) {
    return t();
  }
  const config = await getConfig(db, seasonId);
  const lang = languageSchema.catch(env.DEFAULT_LANGUAGE).parse(config?.language);
  return t(lang);
};

export type { Translations };
