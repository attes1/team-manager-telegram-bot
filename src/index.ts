import { createBot, setCommands } from './bot/index';

const main = async () => {
  const bot = createBot();

  console.log('Starting bot...');
  await bot.start({
    onStart: async (botInfo) => {
      console.log(`Bot @${botInfo.username} started successfully`);
      await setCommands(bot);
      console.log('Commands registered');
    },
  });
};

main().catch(console.error);
