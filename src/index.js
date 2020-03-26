// eslint-disable-next-line
require('dotenv').config();
const { App } = require('@slack/bolt');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

slack.message('idiot', async ({ say }) => {
  say('I AM IDIOT');
});

slack.message('play', async ({ message, client, context }) => {
  const playing = await redis.get('playing');
  if (parseInt(playing) !== 1) {
    await redis.set('playing', 1);
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text: 'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY',
    });
    if (ok) {
      await redis.del('players');
      await redis.sadd('players', [message.user]);
      await redis.set('letsPlayMessage', ts);
      await redis.set('currentPlayer', message.user);
    }
  }
});

slack.event('reaction_added', async ({ event }) => {
  const { user, item } = event;
  const letsPlayMessage = await redis.get('letsPlayMessage');
  if (item.ts === letsPlayMessage) {
    await redis.sadd('players', user);
  }
});

slack.event('reaction_removed', async ({ event }) => {
  const { user, item } = event;
  const letsPlayMessage = await redis.get('letsPlayMessage');
  if (item.ts === letsPlayMessage) {
    await redis.srem('players', user);
  }
});

// Restart the playing of redis
redis.set('playing', 0);
// Start the app
console.log('🚀 STARTING...');
slack.start(process.env.PORT || 3000);
