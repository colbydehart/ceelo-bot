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
  const game = await Data.currentGame();
  if (!game.created) {
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text: 'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY',
    });
    if (ok) {
      await Data.getPlayerBySlackId(message.user);
      game.scores.push({ playerSlackId: message.user, score: null });
      game.messageTimestamp = ts;
      game.created = true;
      await game.save();
    }
  }
});

// ROLL - Roll the dice, start the game if the game isn't started
slack.message('roll', async ({ message, client }) => {
  const game = await Data.currentGame();
  const nextScore = game.scores[0];
  if (message.user !== nextScore.playerSlackId) return;
  if (!game.started) {
    game.scores.forEach((s) => {
      const player = Data.getPlayerBySlackId(s.playerSlackId);
      // take a point from everyone
      if (player && player.save) {
        player.total -= 1;
        player.save();
      }
    });
    game.started = true;
    await game.save();
  }
  const resultText = ceelo.roll();
  client.chat.postMessage({
    token: context.botToken,
    channel: message.channel,
    text: resultText,
  });
});

// REACTION ADDED - listen for reactions for the current game
slack.event('reaction_added', async ({ event }) => {
  const { user, item } = event;
  const game = await Data.currentGame();
  if (
    item.ts === game.messageTimestamp &&
    !game.scores.some((score) => score.playerSlackId === user)
  ) {
    console.log(`adding ${user}`);
    await Data.getPlayerBySlackId(user);
    game.scores.push({ playerSlackId: user, score: null });
    await game.save();
  }
});

// REACTION REMOVED - listen for reactions for the current
slack.event('reaction_removed', async ({ event }) => {
  const { user, item } = event;
  const game = await Data.currentGame();
  if (
    item.ts === game.messageTimestamp &&
    game.scores.some((score) => score.playerSlackId === user)
  ) {
    await Data.getPlayerBySlackId(user);
    game.scores = game.scores.filter((s) => s.playerSlackId !== user);
    await game.save();
  }
});

// Start the app
console.log('🚀 STARTING...');
slack.start(process.env.PORT || 3000);
