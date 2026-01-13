export interface PendingInvitation {
  // One of these will be set depending on how admin initiated
  username?: string; // Flow A: username-based
  userId?: number; // Flow B: text_mention-based
  displayName: string; // For messages and roster entry
  chatId: number;
  messageId: number;
  seasonId: number;
  adminId: number;
  createdAt: Date;
}

const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory store: messageId -> PendingInvitation
const pendingInvitations = new Map<number, PendingInvitation>();

export const addInvitation = (
  messageId: number,
  invitation: Omit<PendingInvitation, 'createdAt'>,
) => {
  pendingInvitations.set(messageId, {
    ...invitation,
    createdAt: new Date(),
  });
};

export const getInvitation = (messageId: number): PendingInvitation | undefined => {
  const invitation = pendingInvitations.get(messageId);
  if (!invitation) {
    return undefined;
  }

  // Check if expired
  if (Date.now() - invitation.createdAt.getTime() > EXPIRATION_MS) {
    pendingInvitations.delete(messageId);
    return undefined;
  }

  return invitation;
};

export const removeInvitation = (messageId: number): boolean => {
  return pendingInvitations.delete(messageId);
};

export const cleanupExpired = (): number => {
  const now = Date.now();
  let removed = 0;

  for (const [messageId, invitation] of pendingInvitations) {
    if (now - invitation.createdAt.getTime() > EXPIRATION_MS) {
      pendingInvitations.delete(messageId);
      removed++;
    }
  }

  return removed;
};

// For testing purposes
export const clearAll = () => {
  pendingInvitations.clear();
};

export const getAll = (): Map<number, PendingInvitation> => {
  return new Map(pendingInvitations);
};
