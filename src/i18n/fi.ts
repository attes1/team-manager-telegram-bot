export interface Translations {
  bot: {
    started: string;
  };
  errors: {
    notAdmin: string;
    noActiveSeason: string;
    noUserMentioned: string;
    playerNotFound: string;
    playerNotInRoster: string;
    missingSeasonName: string;
    invalidConfigKey: string;
    invalidConfigValue: (key: string) => string;
  };
  roster: {
    added: (name: string) => string;
    removed: (name: string) => string;
    alreadyInRoster: (name: string) => string;
    empty: string;
    title: string;
    playerLine: (name: string, username: string | null) => string;
  };
  season: {
    started: (name: string) => string;
    ended: (name: string) => string;
    alreadyEnded: string;
    info: (name: string, status: string, createdAt: string) => string;
    statusActive: string;
    statusEnded: string;
  };
  config: {
    title: string;
    updated: (key: string, value: string) => string;
    line: (key: string, value: string) => string;
    usage: string;
    keys: {
      language: string;
      poll_day: string;
      poll_time: string;
      poll_days: string;
      poll_times: string;
      reminder_day: string;
      reminder_time: string;
      reminders_mode: string;
      match_day: string;
      match_time: string;
      lineup_size: string;
    };
  };
  week: {
    setPractice: (week: number, dateRange: string) => string;
    setMatch: (week: number, dateRange: string) => string;
    usage: string;
    invalidWeek: string;
    invalidType: string;
  };
}

export const fi: Translations = {
  bot: {
    started: 'Pappaliiga Bot käynnistetty!',
  },
  errors: {
    notAdmin: 'Sinulla ei ole oikeuksia tähän komentoon.',
    noActiveSeason: 'Ei aktiivista kautta. Aloita kausi komennolla /season start <nimi>',
    noUserMentioned: 'Mainitse käyttäjä komennossa (esim. /addplayer @käyttäjä)',
    playerNotFound: 'Pelaajaa ei löytynyt.',
    playerNotInRoster: 'Pelaaja ei ole rosterissa.',
    missingSeasonName: 'Anna kauden nimi (esim. /season start Kevät 2025)',
    invalidConfigKey: 'Tuntematon asetus. Käytä /config nähdäksesi vaihtoehdot.',
    invalidConfigValue: (key) => `Virheellinen arvo asetukselle "${key}".`,
  },
  roster: {
    added: (name) => `${name} lisätty rosteriin.`,
    removed: (name) => `${name} poistettu rosterista.`,
    alreadyInRoster: (name) => `${name} on jo rosterissa.`,
    empty: 'Rosteri on tyhjä.',
    title: 'Rosteri:',
    playerLine: (name, username) => (username ? `• ${name} (@${username})` : `• ${name}`),
  },
  season: {
    started: (name) => `Kausi "${name}" aloitettu!`,
    ended: (name) => `Kausi "${name}" päättynyt.`,
    alreadyEnded: 'Ei aktiivista kautta päätettäväksi.',
    info: (name, status, createdAt) => `Kausi: ${name}\nTila: ${status}\nAloitettu: ${createdAt}`,
    statusActive: 'Aktiivinen',
    statusEnded: 'Päättynyt',
  },
  config: {
    title: 'Asetukset:',
    updated: (key, value) => `${key} = ${value}`,
    line: (key, value) => `${key}: ${value}`,
    usage: 'Käyttö: /config <asetus> <arvo>',
    keys: {
      language: 'Kieli',
      poll_day: 'Kyselyn päivä',
      poll_time: 'Kyselyn aika',
      poll_days: 'Kyselyn päivät',
      poll_times: 'Kyselyn kellonajat',
      reminder_day: 'Muistutuksen päivä',
      reminder_time: 'Muistutuksen aika',
      reminders_mode: 'Muistutustila',
      match_day: 'Oletusmatsin päivä',
      match_time: 'Oletusmatsin aika',
      lineup_size: 'Kokoonpanon koko',
    },
  },
  week: {
    setPractice: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty treeniviioksi.`,
    setMatch: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty matsiviikoksi.`,
    usage: 'Käyttö: /setweek <viikko> practice|match',
    invalidWeek: 'Virheellinen viikkonumero.',
    invalidType: 'Virheellinen tyyppi. Käytä "practice" tai "match".',
  },
};
