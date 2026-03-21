import * as dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN || (() => {
  console.error('Error: BOT_TOKEN is not set in environment variables.');
  process.exit(1);
})();

const bot = new Telegraf(BOT_TOKEN);

// Global error handler
bot.catch((err, ctx) => {
  console.error(`Error for update ${ctx.updateType}:`, err);
});

// /start command
bot.start(async (ctx) => {
  await ctx.reply('Welcome! Tap the button below to open the app.', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🎮 Open App', web_app: { url: 'https://tongames.vercel.app/' } },
      ]],
    },
  });
});

// Mini App data
bot.on(message('web_app_data'), async (ctx) => {
  const data = ctx.message.web_app_data.data;
  console.log('Received Mini App data:', data);
  await ctx.reply(`Received from app: ${data}`);
});

// ── Setup (one-time async tasks before polling starts) ────────────────────────
await bot.telegram.deleteWebhook({ drop_pending_updates: true });
console.log('Webhook cleared.');

await bot.telegram.setChatMenuButton({
  menu_button: {
    type:    'web_app',
    text:    'Open App',
    web_app: { url: 'https://tongames.vercel.app/' },
  },
});
console.log('Menu button set.');

// ── Launch (do NOT await — long polling runs forever) ─────────────────────────
bot.launch({
  allowedUpdates: ['message', 'callback_query', 'inline_query'],
});

console.log('✅ Telegram bot is running.');

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));