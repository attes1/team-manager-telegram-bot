import type { Bot } from 'grammy';
import type { BotContext } from '../../context';

export const registerHelpCommand = (bot: Bot<BotContext>) => {
  bot.command('help', async (ctx) => {
    const { i18n, isAdmin, isCaptain, isInRoster } = ctx;

    const lines: string[] = [
      `<b>${i18n.help.publicCommands}</b>`,
      `• /help - ${i18n.help.commands.help}`,
      `• /roster - ${i18n.help.commands.roster}`,
      `• /nextmatch - ${i18n.help.commands.nextmatch}`,
    ];

    if (isInRoster || isCaptain || isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.playerCommands}</b>`);
      lines.push(`• /avail - ${i18n.help.commands.avail}`);
      lines.push(`• /poll - ${i18n.help.commands.poll}`);
      lines.push(`• /status - ${i18n.help.commands.status}`);
    }

    if (isCaptain || isAdmin) {
      lines.push('');
      lines.push(`<b>${i18n.help.captainCommands}</b>`);
      lines.push(`• /setweek - ${i18n.help.commands.setweek}`);
      lines.push(`• /setmatch - ${i18n.help.commands.setmatch}`);
      lines.push(`• /setlineup - ${i18n.help.commands.setlineup}`);
      lines.push(`• /remind - ${i18n.help.commands.remind}`);
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
      lines.push(`• /setcaptain - ${i18n.help.commands.setcaptain}`);
      lines.push(`• /removecaptain - ${i18n.help.commands.removecaptain}`);
    }

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  });
};
