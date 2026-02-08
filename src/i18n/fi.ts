export interface Translations {
  bot: {
    started: string;
  };
  errors: {
    notAdmin: string;
    notCaptain: string;
    noActiveSeason: string;
    noUserMentioned: string;
    playerNotFound: string;
    playerNotInRoster: string;
    missingSeasonName: string;
    invalidConfigKey: string;
    invalidConfigValue: (key: string) => string;
    notInRoster: string;
    notAvailableInPublicGroup: string;
    commandsRestrictedToAdmins: string;
  };
  roster: {
    added: (name: string) => string;
    removed: (name: string) => string;
    alreadyInRoster: (name: string) => string;
    empty: string;
    title: string;
    playerLine: (name: string, username: string | null) => string;
    captainLine: (name: string, username: string | null) => string;
    invitationPrompt: string;
    invitationSent: (name: string) => string;
    invitationAccepted: (name: string) => string;
    invitationAcceptedDm: string;
    invitationDeclined: (name: string) => string;
    invitationExpired: string;
    acceptButton: string;
    addplayerUsage: string;
  };
  captain: {
    promoted: (name: string) => string;
    demoted: (name: string) => string;
    alreadyCaptain: (name: string) => string;
    notACaptain: (name: string) => string;
    usage: string;
    removeUsage: string;
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
    currentValue: string;
    availableOptions: string;
    keys: {
      language: string;
      poll_day: string;
      poll_time: string;
      poll_days: string;
      poll_times: string;
      week_change_day: string;
      week_change_time: string;
      reminder_day: string;
      reminder_time: string;
      reminders_mode: string;
      match_day: string;
      match_time: string;
      lineup_size: string;
      match_day_reminder_mode: string;
      match_day_reminder_time: string;
      public_announcements: string;
      public_commands_mode: string;
      menu_expiration_hours: string;
      menu_cleanup_time: string;
    };
    options: {
      language: string;
      poll_day: string;
      poll_time: string;
      poll_days: string;
      poll_times: string;
      week_change_day: string;
      week_change_time: string;
      reminder_day: string;
      reminder_time: string;
      reminders_mode: string;
      match_day: string;
      match_time: string;
      lineup_size: string;
      match_day_reminder_mode: string;
      match_day_reminder_time: string;
      public_announcements: string;
      public_commands_mode: string;
      menu_expiration_hours: string;
      menu_cleanup_time: string;
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
    practiceLegend: string;
    notInRoster: string;
    invalidWeek: string;
    weekInPast: (schedulingWeek: number) => string;
    days: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
      sun: string;
    };
    openPollButton: string;
    dmSent: string;
    dmFailed: (botUsername: string) => string;
  };
  avail: {
    title: (week: number, dateRange: string) => string;
    practiceTitle: (week: number, dateRange: string) => string;
    matchTitle: (week: number, dateRange: string) => string;
    dayTitle: (day: string, date: string, week: number) => string;
    noResponses: string;
    noResponsesForDay: (day: string) => string;
    usage: string;
    invalidWeek: string;
    weekInPast: (schedulingWeek: number) => string;
  };
  match: {
    scheduled: (day: string, time: string, week: number, dateRange: string) => string;
    usage: string;
    invalidDay: string;
    invalidTime: string;
    invalidWeek: string;
    weekInPast: (schedulingWeek: number) => string;
  };
  lineup: {
    set: (count: number, players: string, week: number, dateRange: string) => string;
    cleared: string;
    usage: string;
    noMentions: string;
    playerNotInRoster: (name: string) => string;
    menuTitle: (week: number, dateRange: string) => string;
    selectPlayers: string;
    done: string;
    needExact: (count: number) => string;
    saved: (count: number) => string;
    notCaptain: string;
    practiceWeek: string;
    invalidWeek: string;
    weekInPast: (schedulingWeek: number) => string;
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
    schedulingFor: string;
    weekLabel: (week: number) => string;
    devBadge: string;
    schedulesTitle: string;
    pollSchedule: string;
    reminderSchedule: string;
    matchDayReminderSchedule: string;
    menuCleanupSchedule: string;
    scheduleOff: string;
  };
  help: {
    publicCommands: string;
    playerCommands: string;
    captainCommands: string;
    adminCommands: string;
    devCommands: string;
    legend: string;
    commands: {
      help: string;
      roster: string;
      nextmatch: string;
      avail: string;
      poll: string;
      status: string;
      setweek: string;
      setmatch: string;
      setlineup: string[];
      setopponent: string;
      remind: string;
      startseason: string;
      endseason: string;
      season: string;
      config: string[];
      addplayer: string;
      removeplayer: string;
      promote: string;
      demote: string;
      setgrouptype: string;
      devpoll: string;
      devreminder: string;
      devmatchreminder: string;
      devtrigger: string;
      devschedule: string;
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
    matchAlreadyPlayed: string;
    noUpcomingMatch: string;
    opponent: (name: string) => string;
    opponentWithUrl: (name: string, url: string) => string;
  };
  opponent: {
    set: (name: string, week: number, dateRange: string) => string;
    setWithUrl: (name: string, url: string, week: number, dateRange: string) => string;
    cleared: string;
    usage: string;
    noOpponentSet: string;
    invalidWeek: string;
  };
  group: {
    notInGroup: string;
    notRegistered: string;
    usage: string;
    setTeam: string;
    setPublic: string;
    noTeamGroup: string;
  };
  dev: {
    notDevMode: string;
    pollScheduled: (minutes: number) => string;
    reminderScheduled: (minutes: number) => string;
    matchReminderScheduled: (minutes: number) => string;
    triggerUsage: string;
    triggerInvalidTask: string;
    triggerStarted: (task: string) => string;
    scheduleTitle: string;
    scheduleLine: (name: string, nextRun: string) => string;
    noTasks: string;
    noTeamGroup: string;
  };
}

export const fi: Translations = {
  bot: {
    started: 'Team Manager Bot käynnistetty!',
  },
  errors: {
    notAdmin: 'Sinulla ei ole oikeuksia tähän komentoon.',
    notCaptain: 'Sinulla ei ole kapteenin oikeuksia tähän komentoon.',
    noActiveSeason: 'Ei aktiivista kautta. Aloita kausi komennolla /startseason <nimi>',
    noUserMentioned: 'Mainitse käyttäjä komennossa (esim. /addplayer @käyttäjä)',
    playerNotFound: 'Pelaajaa ei löytynyt.',
    playerNotInRoster: 'Pelaaja ei ole rosterissa.',
    missingSeasonName: 'Anna kauden nimi (esim. /startseason Kevät 2025)',
    invalidConfigKey: 'Tuntematon asetus. Käytä /config nähdäksesi vaihtoehdot.',
    invalidConfigValue: (key) => `Virheellinen arvo asetukselle "${key}".`,
    notInRoster: 'Et ole rosterissa. Pyydä adminia lisäämään sinut.',
    notAvailableInPublicGroup: 'Komento ei käytettävissä yleisessä ryhmässä.',
    commandsRestrictedToAdmins: 'Komennot on rajoitettu ylläpitäjille tässä ryhmässä.',
  },
  roster: {
    added: (name) => `${name} lisätty rosteriin.`,
    removed: (name) => `${name} poistettu rosterista.`,
    alreadyInRoster: (name) => `${name} on jo rosterissa.`,
    empty: 'Rosteri on tyhjä.',
    title: 'Rosteri:',
    playerLine: (name, username) => (username ? `• ${name} (@${username})` : `• ${name}`),
    captainLine: (name, username) => (username ? `⭐ ${name} (@${username})` : `⭐ ${name}`),
    invitationPrompt: 'Sinut on kutsuttu rosteriin!',
    invitationSent: (name) => `Kutsu lähetetty: ${name}`,
    invitationAccepted: (name) => `${name} lisätty rosteriin!`,
    invitationAcceptedDm: 'Tervetuloa rosteriin! Saat viikkokyselyt tänne.',
    invitationDeclined: (name) => `${name} hylkäsi kutsun.`,
    invitationExpired: 'Kutsu vanhentunut.',
    acceptButton: 'Hyväksy kutsu',
    addplayerUsage: 'Käyttö: /addplayer <käyttäjänimi>',
  },
  captain: {
    promoted: (name) => `${name} ylennetty kapteeniksi.`,
    demoted: (name) => `${name} alennettu pelaajaksi.`,
    alreadyCaptain: (name) => `${name} on jo kapteeni.`,
    notACaptain: (name) => `${name} ei ole kapteeni.`,
    usage: 'Käyttö: /promote @pelaaja',
    removeUsage: 'Käyttö: /demote @pelaaja',
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
    currentValue: 'Nykyinen arvo',
    availableOptions: 'Vaihtoehdot',
    keys: {
      language: 'Kieli',
      poll_day: 'Kyselyn päivä',
      poll_time: 'Kyselyn aika',
      poll_days: 'Kyselyn päivät',
      poll_times: 'Kyselyn kellonajat',
      week_change_day: 'Viikon vaihto (päivä)',
      week_change_time: 'Viikon vaihto (kello)',
      reminder_day: 'Muistutuksen päivä',
      reminder_time: 'Muistutuksen aika',
      reminders_mode: 'Muistutustila',
      match_day: 'Matsin oletuspäivä',
      match_time: 'Matsin oletusaika',
      lineup_size: 'Linarin koko',
      match_day_reminder_mode: 'Matsipäivän muistutustila',
      match_day_reminder_time: 'Matsipäivän muistutusaika',
      public_announcements: 'Julkiset ilmoitukset',
      public_commands_mode: 'Komennot julkisissa ryhmissä',
      menu_expiration_hours: 'Valikon vanheneminen (tuntia)',
      menu_cleanup_time: 'Valikon siivousaika',
    },
    options: {
      language: 'fi, en',
      poll_day: 'mon, tue, wed, thu, fri, sat, sun',
      poll_time: 'HH:MM (esim. 10:00)',
      poll_days: 'mon,tue,wed,thu,fri,sat,sun (pilkulla erotettuna)',
      poll_times: '0-23 (pilkulla erotettuna, max 5)',
      week_change_day: 'mon, tue, wed, thu, fri, sat, sun',
      week_change_time: 'HH:MM (esim. 10:00)',
      reminder_day: 'mon, tue, wed, thu, fri, sat, sun',
      reminder_time: 'HH:MM (esim. 18:00)',
      reminders_mode: 'ping, quiet, off',
      match_day: 'mon, tue, wed, thu, fri, sat, sun',
      match_time: 'HH:MM (esim. 20:00)',
      lineup_size: '1-20',
      match_day_reminder_mode: 'ping, quiet, off',
      match_day_reminder_time: 'HH:MM (esim. 18:00)',
      public_announcements: 'on, off',
      public_commands_mode: 'all, admins',
      menu_expiration_hours: '1-168',
      menu_cleanup_time: 'HH:MM (esim. 04:00)',
    },
  },
  week: {
    setPractice: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty treeniviikoksi.`,
    setMatch: (week, dateRange) => `Vko ${week} (${dateRange}) merkitty matsiviikoksi.`,
    usage:
      'Käyttö: /setweek [week[/year]] <practice|match>\nEsim: /setweek 5 practice tai /setweek 5/2026 match',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
    invalidType: 'Virheellinen tyyppi. Käytä "practice" tai "match".',
  },
  poll: {
    title: (week, dateRange) =>
      `Vko ${week} (${dateRange}) - treeniviikko!\nMerkkaa milloin pääset peleille.`,
    matchWeekTitle: (week, dateRange) =>
      `Vko ${week} (${dateRange}) - matsiviikko!\nOletusaika su 20:00. Merkkaa milloin pääset peleille.`,
    legend: '✅ Vapaa | 🏋️ Vain treeni | 🏆 Vain matsi | ⚠️ Jos tarve | ❌ Ei pääse',
    practiceLegend: '🏋️ Pääsee treeneihin | ❌ Ei pääse',
    notInRoster: 'Valikko on vain rosterissa oleville pelaajille.',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
    weekInPast: (schedulingWeek) => `Viikon pitää olla ${schedulingWeek} tai myöhempi.`,
    days: {
      mon: 'Ma',
      tue: 'Ti',
      wed: 'Ke',
      thu: 'To',
      fri: 'Pe',
      sat: 'La',
      sun: 'Su',
    },
    openPollButton: '📊 Avaa polli',
    dmSent: '📬 Polli lähetetty yksityisviestinä!',
    dmFailed: (botUsername) =>
      `Aloita keskustelu botin kanssa saadaksesi pollin: t.me/${botUsername}`,
  },
  avail: {
    title: (week, dateRange) => `Vko ${week} (${dateRange}) aikataulut:`,
    practiceTitle: (week, dateRange) => `Vko ${week} (${dateRange}) treenivalmius:`,
    matchTitle: (week, dateRange) => `Vko ${week} (${dateRange}) matsivalmius:`,
    dayTitle: (day, date, week) => `Vko ${week}: ${day} ${date} aikataulut:`,
    noResponses: 'Ei vastauksia.',
    noResponsesForDay: (day) => `Ei vastauksia päivälle ${day}.`,
    usage: 'Käyttö: /avail [practice|match] [today|day[/week[/year]]] [week[/year]]',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
    weekInPast: (schedulingWeek) => `Viikon pitää olla ${schedulingWeek} tai myöhempi.`,
  },
  match: {
    scheduled: (day, time, week, dateRange) =>
      `Matsi sovittu: ${day} klo ${time} (vko ${week}, ${dateRange})`,
    usage:
      'Käyttö: /setmatch <day[/week[/year]]> <time>\nEsim: /setmatch sun 20:00 tai /setmatch sun/5 20:00',
    invalidDay: 'Virheellinen päivä. Käytä: mon, tue, wed, thu, fri, sat, sun',
    invalidTime: 'Virheellinen aika. Käytä muotoa HH:MM (esim. 20:00)',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
    weekInPast: (schedulingWeek) => `Viikon pitää olla ${schedulingWeek} tai myöhempi.`,
  },
  lineup: {
    set: (count, players, week, dateRange) =>
      `Linari asetettu (${count} pelaajaa, vko ${week}, ${dateRange}):\n${players}`,
    cleared: 'Linari tyhjennetty.',
    usage:
      'Käyttö: /setlineup @pelaaja1 @pelaaja2 ... [week[/year]]\nTai /setlineup clear [week[/year]] tyhjentääksesi',
    noMentions: 'Mainitse pelaajat komennossa (esim. /setlineup @pelaaja1 @pelaaja2)',
    playerNotInRoster: (name) => `${name} ei ole rosterissa.`,
    menuTitle: (week, dateRange) => `Vko ${week} (${dateRange}) linari`,
    selectPlayers: 'Valitse pelaajat klikkaamalla:',
    done: 'Valmis',
    needExact: (count) => `Valitse ${count} pelaajaa.`,
    saved: (count) => `Linari tallennettu (${count} pelaajaa).`,
    notCaptain: 'Valikko on vain kapteeneille.',
    practiceWeek: 'Linaria ei voi asettaa treeniviikolla.',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
    weekInPast: (schedulingWeek) => `Viikon pitää olla ${schedulingWeek} tai myöhemmin.`,
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
    matchTime: 'Seuraava matsi',
    lineup: 'Linari',
    schedulingFor: 'Suunnitellaan viikolle',
    weekLabel: (week) => `Vko ${week}`,
    devBadge: '[DEVELOPMENT]',
    schedulesTitle: 'Ajastukset',
    pollSchedule: 'Kysely',
    reminderSchedule: 'Muistutus',
    matchDayReminderSchedule: 'Matsipäivämuistutus',
    menuCleanupSchedule: 'Valikon siivous',
    scheduleOff: 'pois',
  },
  help: {
    publicCommands: 'Julkiset komennot',
    playerCommands: 'Pelaajan komennot',
    captainCommands: 'Kapteenin komennot',
    adminCommands: 'Admin-komennot',
    devCommands: 'Kehittäjän komennot',
    legend: '&lt;required&gt; [optional] a|b = valinta',
    commands: {
      help: 'Näytä komennot',
      roster: 'Näytä joukkueen rosteri',
      nextmatch: 'Näytä seuraavan matsin tiedot',
      avail: 'Näytä aikataulut [practice|match] [today|day[/week[/year]]] [week[/year]]',
      poll: 'Näytä aikataulukysely [week[/year]]',
      status: 'Näytä tilannekatsaus',
      setweek: 'Aseta viikon tyyppi [week[/year]] &lt;practice|match&gt;',
      setmatch: 'Ajoita matsi &lt;day[/week[/year]]&gt; &lt;time&gt;',
      setlineup: [
        'Avaa linarivalikko [week[/year]]',
        'Aseta linari @players... [week[/year]] | clear [week[/year]]',
      ],
      setopponent: 'Aseta vihu &lt;name&gt; [url] [week[/year]] | clear [week[/year]]',
      remind: 'Lähetä muistutus vastaamattomille',
      startseason: 'Aloita uusi kausi &lt;name&gt;',
      endseason: 'Päätä nykyinen kausi',
      season: 'Näytä kauden tiedot',
      config: [
        'Näytä kaikki asetukset',
        'Näytä asetuksen asetukset [key]',
        'Muokkaa asetusta &lt;key&gt; &lt;value&gt;',
      ],
      addplayer: 'Lisää pelaaja rosteriin @player',
      removeplayer: 'Poista pelaaja rosterista @player',
      promote: 'Ylennä pelaaja kapteeniksi @player',
      demote: 'Alenna kapteeni pelaajaksi @player',
      setgrouptype: 'Aseta ryhmätyyppi &lt;public|team&gt;',
      devpoll: 'Ajasta kysely [minuuttia]',
      devreminder: 'Ajasta muistutus [minuuttia]',
      devmatchreminder: 'Ajasta matsipäivämuistutus [minuuttia]',
      devtrigger: 'Suorita ajastettu tehtävä &lt;poll|reminder|matchreminder&gt;',
      devschedule: 'Näytä ajastusten tila',
    },
  },
  announcements: {
    nextMatch: (week, dateRange) => `🎮 Vko ${week} (${dateRange}) matsi`,
    matchTime: (day, time) => `📅 ${day} klo ${time}`,
    matchTimeDefault: (day, time) => `📅 Oletusaika: ${day} klo ${time}`,
    matchTimeNotSet: '📅 Aikaa ei vielä sovittu',
    lineupTitle: 'Linari:',
    lineupEmpty: 'Linaria ei ole vielä asetettu',
    lineupPlayer: (name) => `• ${name}`,
    lineupSet: (count) => `🎮 Linari asetettu (${count} pelaajaa)!`,
    matchScheduled: (day, time) => `📅 Matsi sovittu: ${day} klo ${time}`,
    noMatchWeek: 'Tällä viikolla ei ole matsia.',
    matchAlreadyPlayed: 'Tämän viikon matsi on jo pelattu.',
    noUpcomingMatch: 'Ei tietoa seuraavasta matsista.',
    opponent: (name) => `🆚 Vihu: ${name}`,
    opponentWithUrl: (name, url) => `🆚 Vihu: [${name}](${url})`,
  },
  opponent: {
    set: (name, week, dateRange) => `Vihu asetettu: ${name} (vko ${week}, ${dateRange})`,
    setWithUrl: (name, url, week, dateRange) =>
      `Vihu asetettu: ${name} (${url}) (vko ${week}, ${dateRange})`,
    cleared: 'Vihu poistettu.',
    usage:
      'Käyttö: /setopponent <nimi> [url] [week[/year]]\nEsim: /setopponent EC Myyrylit https://example.com/team 5',
    noOpponentSet: 'Vihua ei ole asetettu.',
    invalidWeek: 'Virheellinen viikko. Käytä: 5 tai 5/2026',
  },
  group: {
    notInGroup: 'Tätä komentoa voi käyttää vain ryhmässä.',
    notRegistered: 'Ryhmää ei ole rekisteröity. Poista ja lisää botti uudelleen.',
    usage: 'Käyttö: /setgrouptype <public|team>',
    setTeam: 'Tämä ryhmä on nyt tiimin ryhmä. Kyselyt ja muistutukset lähetetään tänne.',
    setPublic: 'Ryhmän tyyppi muutettu julkiseksi.',
    noTeamGroup: 'Tiimin ryhmää ei ole asetettu.',
  },
  dev: {
    notDevMode: 'Komento käytettävissä vain development-tilassa.',
    pollScheduled: (minutes) => `Kysely ajastettu ${minutes} minuutin päähän.`,
    reminderScheduled: (minutes) => `Muistutus ajastettu ${minutes} minuutin päähän.`,
    matchReminderScheduled: (minutes) =>
      `Matsipäivämuistutus ajastettu ${minutes} minuutin päähän.`,
    triggerUsage: 'Käyttö: /devtrigger <poll|reminder|matchreminder>',
    triggerInvalidTask: 'Tuntematon tehtävä. Käytä: poll, reminder, matchreminder',
    triggerStarted: (task) => `Tehtävä "${task}" käynnistetty.`,
    scheduleTitle: 'Ajastetut tehtävät:',
    scheduleLine: (name, nextRun) => `• ${name}: ${nextRun}`,
    noTasks: 'Ei ajastettuja tehtäviä.',
    noTeamGroup: 'Tiimin ryhmää ei ole asetettu.',
  },
};
