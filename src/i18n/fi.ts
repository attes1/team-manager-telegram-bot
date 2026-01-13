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
    notInRoster: string;
  };
  roster: {
    added: (name: string) => string;
    removed: (name: string) => string;
    alreadyInRoster: (name: string) => string;
    empty: string;
    title: string;
    playerLine: (name: string, username: string | null) => string;
    invitationPrompt: string;
    invitationSent: (name: string) => string;
    invitationAccepted: (name: string) => string;
    invitationDeclined: (name: string) => string;
    invitationExpired: string;
    addplayerUsage: string;
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
      match_day_reminder_enabled: string;
      match_day_reminder_time: string;
    };
  };
  week: {
    setPractice: (week: number, dateRange: string) => string;
    setMatch: (week: number, dateRange: string) => string;
    usage: string;
    invalidWeek: string;
    invalidType: string;
  };
  poll: {
    title: (week: number, dateRange: string) => string;
    matchWeekTitle: (week: number, dateRange: string) => string;
    legend: string;
    days: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
      sun: string;
    };
  };
  practice: {
    title: (week: number, dateRange: string) => string;
    dayTitle: (day: string, date: string) => string;
    noResponses: string;
    noResponsesForDay: (day: string) => string;
    playerLine: (name: string, times: string[], status: string) => string;
    invalidDay: string;
    usage: string;
  };
  match: {
    scheduled: (day: string, time: string, week: number, dateRange: string) => string;
    usage: string;
    invalidDay: string;
    invalidTime: string;
    info: (week: number, dateRange: string) => string;
    time: (day: string, time: string) => string;
    timeDefault: (day: string, time: string) => string;
    notScheduled: string;
    lineupTitle: string;
    lineupEmpty: string;
    lineupPlayer: (name: string) => string;
  };
  lineup: {
    set: (count: number, players: string) => string;
    cleared: string;
    usage: string;
    noMentions: string;
    playerNotInRoster: (name: string) => string;
    menuTitle: (week: number, dateRange: string) => string;
    selectPlayers: string;
    done: string;
    needExact: (count: number) => string;
    saved: (count: number) => string;
  };
  reminder: {
    title: (week: number, dateRange: string) => string;
    allResponded: string;
    missingResponses: (names: string) => string;
    matchDayTitle: (day: string, time: string) => string;
    matchDayLineup: (players: string) => string;
    matchDayNoLineup: string;
  };
  status: {
    title: string;
    season: string;
    week: string;
    weekType: string;
    weekTypes: {
      match: string;
      practice: string;
    };
    roster: string;
    players: string;
    responses: string;
    matchTime: string;
    lineup: string;
  };
  help: {
    title: string;
    publicCommands: string;
    playerCommands: string;
    adminCommands: string;
    commands: {
      help: string;
      roster: string;
      nextmatch: string;
      match: string;
      practice: string;
      startseason: string;
      endseason: string;
      season: string;
      config: string;
      addplayer: string;
      removeplayer: string;
      setweek: string;
      setmatch: string;
      setlineup: string;
      poll: string;
      remind: string;
      status: string;
    };
  };
  announcements: {
    nextMatch: (week: number, dateRange: string) => string;
    matchTime: (day: string, time: string) => string;
    matchTimeDefault: (day: string, time: string) => string;
    matchTimeNotSet: string;
    lineupTitle: string;
    lineupEmpty: string;
    lineupPlayer: (name: string) => string;
    lineupSet: (count: number) => string;
    matchScheduled: (day: string, time: string) => string;
    noMatchWeek: string;
  };
}

export const fi: Translations = {
  bot: {
    started: 'Pappaliiga Bot käynnistetty!',
  },
  errors: {
    notAdmin: 'Sinulla ei ole oikeuksia tähän komentoon.',
    noActiveSeason: 'Ei aktiivista kautta. Aloita kausi komennolla /startseason <nimi>',
    noUserMentioned: 'Mainitse käyttäjä komennossa (esim. /addplayer @käyttäjä)',
    playerNotFound: 'Pelaajaa ei löytynyt.',
    playerNotInRoster: 'Pelaaja ei ole rosterissa.',
    missingSeasonName: 'Anna kauden nimi (esim. /startseason Kevät 2025)',
    invalidConfigKey: 'Tuntematon asetus. Käytä /config nähdäksesi vaihtoehdot.',
    invalidConfigValue: (key) => `Virheellinen arvo asetukselle "${key}".`,
    notInRoster: 'Et ole rosterissa. Pyydä adminia lisäämään sinut.',
  },
  roster: {
    added: (name) => `${name} lisätty rosteriin.`,
    removed: (name) => `${name} poistettu rosterista.`,
    alreadyInRoster: (name) => `${name} on jo rosterissa.`,
    empty: 'Rosteri on tyhjä.',
    title: 'Rosteri:',
    playerLine: (name, username) => (username ? `• ${name} (@${username})` : `• ${name}`),
    invitationPrompt: 'Haluatko liittyä rosteriin? Reagoi 👍 hyväksyäksesi tai 👎 hylätäksesi.',
    invitationSent: (name) => `Kutsu lähetetty: ${name}`,
    invitationAccepted: (name) => `${name} lisätty rosteriin!`,
    invitationDeclined: (name) => `${name} hylkäsi kutsun.`,
    invitationExpired: 'Kutsu vanhentunut.',
    addplayerUsage:
      'Käyttö: /addplayer <käyttäjänimi>\nTai napauta käyttäjän nimeä viestissä ja kirjoita /addplayer',
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
      lineup_size: 'Linarin koko',
      match_day_reminder_enabled: 'Matsipäivän muistutus',
      match_day_reminder_time: 'Matsipäivän muistutusaika',
    },
  },
  week: {
    setPractice: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty treeniviioksi.`,
    setMatch: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty matsiviikoksi.`,
    usage: 'Käyttö: /setweek <viikko> practice|match',
    invalidWeek: 'Virheellinen viikkonumero.',
    invalidType: 'Virheellinen tyyppi. Käytä "practice" tai "match".',
  },
  poll: {
    title: (week, dateRange) =>
      `Vko ${week} (${dateRange}) aikataulukysely.\nMerkkaa milloin pääset pelaamaan:`,
    matchWeekTitle: (week, dateRange) =>
      `Vko ${week} (${dateRange}) - MATSI!\nOletusaika su 20:00. Merkkaa milloin pääset:`,
    legend: '✅ Vapaa | 🏋️ Vain treeni | 🏆 Vain matsi | ⚠️ Jos tarve | ❌ Ei pääse',
    days: {
      mon: 'Ma',
      tue: 'Ti',
      wed: 'Ke',
      thu: 'To',
      fri: 'Pe',
      sat: 'La',
      sun: 'Su',
    },
  },
  practice: {
    title: (week: number, dateRange: string) => `Vko ${week} (${dateRange}) aikataulut:`,
    dayTitle: (day: string, date: string) => `${day} ${date} aikataulut:`,
    noResponses: 'Ei vastauksia.',
    noResponsesForDay: (day: string) => `Ei vastauksia päivälle ${day}.`,
    playerLine: (name: string, times: string[], status: string) =>
      `• ${name}: ${times.join(', ')} ${status}`,
    invalidDay: 'Virheellinen päivä. Käytä: mon, tue, wed, thu, fri, sat, sun',
    usage: 'Käyttö: /practice [today|<päivä>]',
  },
  match: {
    scheduled: (day, time, week, dateRange) =>
      `Matsi sovittu: ${day} klo ${time} (vko ${week}, ${dateRange})`,
    usage: 'Käyttö: /setmatch <päivä> <aika>\nEsim: /setmatch sun 20:00',
    invalidDay: 'Virheellinen päivä. Käytä: mon, tue, wed, thu, fri, sat, sun',
    invalidTime: 'Virheellinen aika. Käytä muotoa HH:MM (esim. 20:00)',
    info: (week, dateRange) => `📅 Vko ${week} (${dateRange}) matsi`,
    time: (day, time) => `Aika: ${day} klo ${time}`,
    timeDefault: (day, time) => `Oletusaika: ${day} klo ${time}`,
    notScheduled: 'Aikaa ei vielä sovittu',
    lineupTitle: 'Linari:',
    lineupEmpty: 'Linaria ei ole vielä asetettu',
    lineupPlayer: (name) => `• ${name}`,
  },
  lineup: {
    set: (count, players) => `Linari asetettu (${count} pelaajaa):\n${players}`,
    cleared: 'Linari tyhjennetty.',
    usage: 'Käyttö: /setlineup @pelaaja1 @pelaaja2 ...\nTai /setlineup clear tyhjentääksesi',
    noMentions: 'Mainitse pelaajat komennossa (esim. /setlineup @pelaaja1 @pelaaja2)',
    playerNotInRoster: (name) => `${name} ei ole rosterissa.`,
    menuTitle: (week, dateRange) => `Vko ${week} (${dateRange}) linari`,
    selectPlayers: 'Valitse pelaajat klikkaamalla:',
    done: 'Valmis',
    needExact: (count) => `Valitse ${count} pelaajaa.`,
    saved: (count) => `Linari tallennettu (${count} pelaajaa).`,
  },
  reminder: {
    title: (week, dateRange) => `📋 Muistutus: Vko ${week} (${dateRange}) aikataulukysely`,
    allResponded: 'Kaikki ovat vastanneet! 🎉',
    missingResponses: (names) => `Puuttuu vastaus:\n${names}`,
    matchDayTitle: (day, time) => `🎮 Matsi tänään! ${day} klo ${time}`,
    matchDayLineup: (players) => `Linari:\n${players}`,
    matchDayNoLineup: 'Linaria ei ole asetettu!',
  },
  status: {
    title: 'Tilannekatsaus',
    season: 'Kausi',
    week: 'Viikko',
    weekType: 'Viikon tyyppi',
    weekTypes: {
      match: 'Matsiviikko',
      practice: 'Treeniviikko',
    },
    roster: 'Rosteri',
    players: 'pelaajaa',
    responses: 'Vastauksia',
    matchTime: 'Matsin aika',
    lineup: 'Linari',
  },
  help: {
    title: 'Pappaliiga Bot - Komennot',
    publicCommands: 'Julkiset komennot',
    playerCommands: 'Pelaajan komennot',
    adminCommands: 'Admin-komennot',
    commands: {
      help: 'Näytä komennot',
      roster: 'Näytä joukkueen rosteri',
      nextmatch: 'Näytä seuraavan matsin tiedot',
      match: 'Näytä matsin tiedot ja linari',
      practice: 'Näytä treenien mahdolliset aikataulut',
      startseason: 'Aloita uusi kausi',
      endseason: 'Päätä nykyinen kausi',
      season: 'Näytä kauden tiedot',
      config: 'Näytä/muokkaa asetuksia',
      addplayer: 'Lisää pelaaja rosteriin',
      removeplayer: 'Poista pelaaja rosterista',
      setweek: 'Aseta viikon tyyppi',
      setmatch: 'Ajoita matsi',
      setlineup: 'Aseta linari',
      poll: 'Lähetä aikataulukysely',
      remind: 'Lähetä muistutus vastaamattomille',
      status: 'Näytä tilannekatsaus',
    },
  },
  announcements: {
    nextMatch: (week, dateRange) => `🎮 Vko ${week} (${dateRange}) matsi`,
    matchTime: (day, time) => `📅 ${day} klo ${time}`,
    matchTimeDefault: (day, time) => `📅 Oletusaika: ${day} klo ${time}`,
    matchTimeNotSet: '📅 Aikaa ei vielä sovittu',
    lineupTitle: '👥 Linari:',
    lineupEmpty: 'Linaria ei ole vielä asetettu',
    lineupPlayer: (name) => `• ${name}`,
    lineupSet: (count) => `🎮 Linari asetettu (${count} pelaajaa)!`,
    matchScheduled: (day, time) => `📅 Matsi sovittu: ${day} klo ${time}`,
    noMatchWeek: 'Tällä viikolla ei ole matsia.',
  },
};
