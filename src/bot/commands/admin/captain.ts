import type { Bot } from 'grammy';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import type { Translations } from '@/i18n';
import { getTextMention, getUsernameFromArgs } from '@/lib/mentions';
import type { RosterRole } from '@/lib/schemas';
import { getPlayerByUsername, getPlayerRole, setPlayerRole } from '@/services/roster';

type CaptainI18n = Translations['captain'];

interface RoleChangeConfig {
  guardRole: RosterRole;
  targetRole: RosterRole;
  guardMsg: (i18n: CaptainI18n) => (name: string) => string;
  successMsg: (i18n: CaptainI18n) => (name: string) => string;
  usageMsg: (i18n: CaptainI18n) => string;
}

const changeRole = (config: RoleChangeConfig) =>
  adminSeasonCommand(async (ctx: AdminSeasonContext) => {
    const { db, season, i18n } = ctx;
    const captain = i18n.captain;

    const mention = getTextMention(ctx);
    if (mention) {
      const role = await getPlayerRole(db, season.id, mention.userId);
      if (role === null) {
        return ctx.reply(i18n.errors.playerNotInRoster);
      }
      if (role === config.guardRole) {
        return ctx.reply(config.guardMsg(captain)(mention.displayName));
      }
      await setPlayerRole(db, season.id, mention.userId, config.targetRole);
      return ctx.reply(config.successMsg(captain)(mention.displayName));
    }

    const username = getUsernameFromArgs(ctx);
    if (username) {
      const player = await getPlayerByUsername(db, season.id, username);
      if (!player) {
        return ctx.reply(i18n.errors.playerNotInRoster);
      }
      const role = await getPlayerRole(db, season.id, player.telegramId);
      if (role === config.guardRole) {
        return ctx.reply(config.guardMsg(captain)(player.displayName));
      }
      await setPlayerRole(db, season.id, player.telegramId, config.targetRole);
      return ctx.reply(config.successMsg(captain)(player.displayName));
    }

    return ctx.reply(config.usageMsg(captain));
  });

export const registerCaptainCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'promote',
    changeRole({
      guardRole: 'captain',
      targetRole: 'captain',
      guardMsg: (c) => c.alreadyCaptain,
      successMsg: (c) => c.promoted,
      usageMsg: (c) => c.usage,
    }),
  );

  bot.command(
    'demote',
    changeRole({
      guardRole: 'player',
      targetRole: 'player',
      guardMsg: (c) => c.notACaptain,
      successMsg: (c) => c.demoted,
      usageMsg: (c) => c.removeUsage,
    }),
  );
};
