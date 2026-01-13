import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';

const formatCommand = (cmd: string, desc: string | string[]): string[] => {
  if (Array.isArray(desc)) {
    return desc.map((d) => `• ${cmd} - ${d}`);
  }
  return [`• ${cmd} - ${desc}`];
};

export const registerHelpCommand = (bot: Bot<BotContext>) => {
  bot.command('help', async (ctx) => {
    const { i18n, isAdmin, isCaptain, isInRoster } = ctx;
    const cmds = i18n.help.commands;

    const lines: string[] = [
      `<b>${i18n.help.publicCommands}</b>`,
      ...formatCommand('/help', cmds.help),
      ...formatCommand('/roster', cmds.roster),
      ...formatCommand('/nextmatch', cmds.nextmatch),
    ];

    if (isInRoster || isCaptain || isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.playerCommands}</b>`);
      lines.push(...formatCommand('/avail', cmds.avail));
      lines.push(...formatCommand('/poll', cmds.poll));
      lines.push(...formatCommand('/status', cmds.status));
    }

    if (isCaptain || isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.captainCommands}</b>`);
      lines.push(...formatCommand('/setweek', cmds.setweek));
      lines.push(...formatCommand('/setmatch', cmds.setmatch));
      lines.push(...formatCommand('/setlineup', cmds.setlineup));
      lines.push(...formatCommand('/setopponent', cmds.setopponent));
      lines.push(...formatCommand('/remind', cmds.remind));
    }

    if (isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.adminCommands}</b>`);
      lines.push(...formatCommand('/startseason', cmds.startseason));
      lines.push(...formatCommand('/endseason', cmds.endseason));
      lines.push(...formatCommand('/season', cmds.season));
      lines.push(...formatCommand('/config', cmds.config));
      lines.push(...formatCommand('/addplayer', cmds.addplayer));
      lines.push(...formatCommand('/removeplayer', cmds.removeplayer));
      lines.push(...formatCommand('/promote', cmds.promote));
      lines.push(...formatCommand('/demote', cmds.demote));
    }

    lines.push('');
    lines.push(`<i>${i18n.help.legend}</i>`);

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  });
};
