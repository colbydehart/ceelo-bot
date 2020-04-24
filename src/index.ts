import { config } from 'dotenv';
config();
import { App } from '@slack/bolt';
import mongoose from 'mongoose';
import {
  createGame,
  currentGame,
  getPlayerBySlackId,
  scores,
  roll,
} from './game';
import { uniqBy } from 'ramda';

mongoose.connect(process.env.MONGODB_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// IDIOT - NEVER FORGET YOU ARE AN IDIOT
slack.message('idiot', async ({ say }) => say('I AM IDIOT'));

// SCORES - say the scores
slack.message(/scores/i, async ({ say }) => say(await scores()));

// PLAY - start playing if there is no game.
slack.message(/play/i, async ({ message, client, context }) => {
  let game = await currentGame();
  if (!game.created) {
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text:
        'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY. U TYPE `roll` 2 ROLL DICE',
    });

    if (ok) {
      createGame(game, ts as string, message.user);
    }
  }
});

// ROLL - Roll the dice, start the game if the game isn't started
slack.message(/roll/i, async ({ message, say }) => {
  const game = await currentGame();
  roll(game, say, message.user);
});

// REACTION ADDED - listen for reactions for the current game
slack.event('reaction_added', async ({ event }) => {
  const { user } = event;
  const item = event.item as { ts: string };
  const game = await currentGame();
  if (
    !game.started &&
    item.ts === game.messageTimestamp &&
    !game.scores.some((score) => score.playerSlackId === user)
  ) {
    console.log(`adding ${user}`);
    await getPlayerBySlackId(user);
    game.scores.push({ playerSlackId: user, value: null });
    game.scores = uniqBy((s) => s.playerSlackId, game.scores);
    await game.save();
  }
});

// REACTION REMOVED - listen for reactions for the current
slack.event('reaction_removed', async ({ event }) => {
  const { user } = event;
  const item = event.item as { ts: string };
  const game = await currentGame();
  if (
    !game.started &&
    item.ts === game.messageTimestamp &&
    game.scores.some((score) => score.playerSlackId === user)
  ) {
    await getPlayerBySlackId(user);
    game.scores = game.scores.filter((s) => s.playerSlackId !== user);
    await game.save();
  }
});

// Start the app
console.log('🚀 STARTING...');
slack.start(process.env.PORT || 3000);

// Data

// Takes away 1 point from each player in the game and sets the game as started.
