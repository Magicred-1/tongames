import * as dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN || (() => {
  console.error('Error: BOT_TOKEN is not set in environment variables.');
  process.exit(1);
})();

const APP_URL = process.env.APP_URL || 'https://tongames.vercel.app';

const bot = new Telegraf(BOT_TOKEN);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate an HMAC-SHA256 hash of the Telegram user data.
 * Mirrors the verification Dynamic's backend performs.
 */
function generateTelegramHash(data) {
  const fields = {
    auth_date: String(data.authDate),
    first_name: data.firstName,
    id:         String(data.id),
    ...(data.lastName  && { last_name:  data.lastName  }),
    ...(data.username  && { username:   data.username  }),
    ...(data.photoURL  && { photo_url:  data.photoURL  }),
  };

  const dataCheckStr = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHash('sha256').update(BOT_TOKEN).digest();
  return createHmac('sha256', secret).update(dataCheckStr).digest('hex');
}

/**
 * Build a signed JWT that Dynamic's telegramSignIn() expects as ?telegramAuthToken=.
 * The bot token is used as the signing secret (HS256).
 */
function buildTelegramAuthToken(from) {
  const userData = {
    authDate:  Math.floor(Date.now() / 1000),
    firstName: from.first_name || '',
    lastName:  from.last_name  || '',
    username:  from.username   || '',
    id:        from.id,
    photoURL:  '',
  };
  const hash = generateTelegramHash(userData);
  return jwt.sign({ ...userData, hash }, BOT_TOKEN, { algorithm: 'HS256' });
}

/**
 * Return a lobby URL with the auth token embedded as a query param.
 * Dynamic reads ?telegramAuthToken= automatically in useTelegramLogin().
 */
function lobbyUrl(from) {
  const token = buildTelegramAuthToken(from);
  return `${APP_URL}/lobby?telegramAuthToken=${encodeURIComponent(token)}`;
}

// ── Global error handler ──────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error(`Error for update ${ctx.updateType}:`, err);
});

// ── /start command ────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const url = lobbyUrl(ctx.update.message.from);
  await ctx.reply('Welcome to TON Games! Tap below to enter the arena.', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🎮 Play Now', web_app: { url } },
      ]],
    },
  });
});

// ── /play command (same as /start, useful as a shortcut) ─────────────────────

bot.command('play', async (ctx) => {
  const url = lobbyUrl(ctx.update.message.from);
  await ctx.reply('Opening TON Games for you...', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🎮 Open Arena', web_app: { url } },
      ]],
    },
  });
});

// ── Mini App data (player actions sent back to bot) ──────────────────────────

bot.on(message('web_app_data'), async (ctx) => {
  const data = ctx.message.web_app_data.data;
  console.log('Received Mini App data:', data);
  await ctx.reply(`Received from app: ${data}`);
});

// ── Setup (one-time async tasks before polling starts) ────────────────────────

await bot.telegram.deleteWebhook({ drop_pending_updates: true });
console.log('Webhook cleared.');

// The persistent menu button cannot carry per-user tokens so we point it to
// the lobby root; users who come through /start get auto-logged in via JWT.
await bot.telegram.setChatMenuButton({
  menu_button: {
    type:    'web_app',
    text:    'Open App',
    web_app: { url: `${APP_URL}/lobby` },
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
