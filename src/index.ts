import { createBot, setCommands } from './bot/index';
import { runMigrations } from './db/migrate';
import { startScheduler } from './scheduler';

const main = async () => {
  await runMigrations();

  const bot = createBot();

  console.log('Starting bot...');
  await bot.start({
    // Enable reaction updates (not included by default)
    allowed_updates: ['message', 'edited_message', 'callback_query', 'message_reaction'],
    onStart: async (botInfo) => {
      console.log(`Bot @${botInfo.username} started successfully`);
      await setCommands(bot);
      console.log('Commands registered');
      await startScheduler(bot);
    },
  });
};

main().catch(console.error);
