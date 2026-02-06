import type { BotContext } from '@/bot/context';

export interface MentionedUser {
  userId: number;
  displayName: string;
  username?: string;
}

export const getTextMentions = (ctx: BotContext): MentionedUser[] =>
  ctx.entities('text_mention').flatMap((m) => {
    if (!m.user) return [];
    const displayName = m.user.first_name + (m.user.last_name ? ` ${m.user.last_name}` : '');
    return [{ userId: m.user.id, displayName, username: m.user.username }];
  });

export const getTextMention = (ctx: BotContext): MentionedUser | null =>
  getTextMentions(ctx)[0] ?? null;

export const getUsernameMentions = (ctx: BotContext): string[] =>
  ctx.entities('mention').map((m) => m.text.replace(/^@/, ''));

export const getUsernameFromArgs = (ctx: BotContext): string | null => {
  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  return parts[1].replace(/^@/, '');
};
