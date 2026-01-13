import { createBot } from './bot';

const main = async () => {
  const bot = createBot();

  console.log('Starting bot...');
  await bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} started successfully`);
    },
  });
};

main().catch(console.error);
