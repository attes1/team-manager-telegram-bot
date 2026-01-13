import type { Bot } from 'grammy';
import type { BotContext } from '../../context';

export const registerHelpCommand = (bot: Bot<BotContext>) => {
  bot.command('help', async (ctx) => {
    const { i18n, isAdmin, isInRoster } = ctx;

    const lines: string[] = [
      `<b>${i18n.help.title}</b>`,
      '',
      `<b>${i18n.help.publicCommands}</b>`,
      `• /help - ${i18n.help.commands.help}`,
      `• /roster - ${i18n.help.commands.roster}`,
      `• /nextmatch - ${i18n.help.commands.nextmatch}`,
    ];

    if (isInRoster || isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.playerCommands}</b>`);
      lines.push(`• /match - ${i18n.help.commands.match}`);
      lines.push(`• /practice - ${i18n.help.commands.practice}`);
    }

    if (isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.adminCommands}</b>`);
      lines.push(`• /startseason - ${i18n.help.commands.startseason}`);
      lines.push(`• /endseason - ${i18n.help.commands.endseason}`);
      lines.push(`• /season - ${i18n.help.commands.season}`);
      lines.push(`• /config - ${i18n.help.commands.config}`);
      lines.push(`• /addplayer - ${i18n.help.commands.addplayer}`);
      lines.push(`• /removeplayer - ${i18n.help.commands.removeplayer}`);
      lines.push(`• /setweek - ${i18n.help.commands.setweek}`);
      lines.push(`• /setmatch - ${i18n.help.commands.setmatch}`);
      lines.push(`• /setlineup - ${i18n.help.commands.setlineup}`);
      lines.push(`• /poll - ${i18n.help.commands.poll}`);
      lines.push(`• /remind - ${i18n.help.commands.remind}`);
      lines.push(`• /status - ${i18n.help.commands.status}`);
    }

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  });
};
