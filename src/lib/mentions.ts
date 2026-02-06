import type { BotContext } from '@/bot/context';

export const getTextMention = (
  ctx: BotContext,
): { userId: number; displayName: string; username?: string } | null => {
  const textMentions = ctx.entities('text_mention');
  if (textMentions.length > 0 && textMentions[0].user) {
    const user = textMentions[0].user;
    const displayName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    return { userId: user.id, displayName, username: user.username };
  }
  return null;
};

export const getUsernameFromArgs = (ctx: BotContext): string | null => {
  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  return parts[1].replace(/^@/, '');
};
