// eslint-disable-next-line
require('dotenv').config();
const { App } = require('@slack/bolt');
const Data = require('./data');

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// IDIOT - NEVER FORGET YOU ARE AN IDIOT
slack.message('idiot', async ({ say }) => {
  say('I AM IDIOT');
});

// PLAY - start playing if there is no game.
slack.message('play', async ({ message, client, context }) => {
  const playing = Data.isPlaying();
  if (playing) {
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text: 'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY',
    });
    if (ok) Data.initializeGame(ts, message.user);
  }
});

// ROLL - Roll the dice, start the game if the game isn't started
slack.message('roll', async ({ message, client }) => {
  const currentPlayer = await Data.currentPlayer();
  if (message.user !== currentPlayer) return;
  let game = Data.game();
  if (!game) {
    // initialize game here if not started yet
    const players = await Data.getPlayers();
    game = ceelo.init(players);
  }
  const { game, resultText } = ceelo.roll(game, currentPlayer);
  client.chat.postMessage({
    token: context.botToken,
    channel: message.channel,
    text: resultText,
  });

  await Data.updateGame(game);
});

// REACTION ADDED - listen for reactions for the current game geStatedMessage
slack.event('reaction_added', async ({ event }) => {
  const { user, item } = event;
  const letsPlayMessage = await Data.letsPlayMessage();
  if (item.ts === letsPlayMessage) {
    await Data.addPlayer(user);
  }
});

// REACTION REMOVED - listen for reactions for the current game geStatedMessage
slack.event('reaction_removed', async ({ event }) => {
  const { user, item } = event;
  const letsPlayMessage = await Data.letsPlayMessage();
  if (item.ts === letsPlayMessage) {
    await Data.removePlayer(user);
  }
});

// Restart the playing of redis
Data.init();
// Start the app
console.log('🚀 STARTING...');
slack.start(process.env.PORT || 3000);
