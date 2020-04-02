// eslint-disable-next-line
require('dotenv').config();
const { App } = require('@slack/bolt');
const Data = require('./data');
const Ceelo = require('./ceelo');

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// IDIOT - NEVER FORGET YOU ARE AN IDIOT
slack.message('idiot', async ({ say }) => {
  say('I AM IDIOT');
});

// SCORES - say the scores
slack.message(/scores/i, async ({ say}) => {
  const msg = await Data.scores();
  say(msg)
})

// PLAY - start playing if there is no game.
slack.message(/play/i, async ({ message, client, context }) => {
  const game = await Data.currentGame();
  if (!game.created) {
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text: 'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY. U TYPE `roll` 2 ROLL THE DICE',
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
slack.message(/roll/i, async ({ message, client, context }) => {
  const game = await Data.currentGame();
  const nextScore = game.scores.find((s) => s.score === null);
  if (message.user !== nextScore.playerSlackId) return;
  if (!game.started) {
    await Promise.all(
      game.scores.map(async (s) => {
        const player = await Data.getPlayerBySlackId(s.playerSlackId);
        // take a point from everyone
        console.log(`taking away 1 point from ${message.user}`);
        player.total = player.total - 1;
        await player.save();
      })
    );
    game.started = true;
    await game.save();
  }
  const resultText = await Ceelo.roll(game);
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
