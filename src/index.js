// eslint-disable-next-line
require('dotenv').config();
const { App } = require('@slack/bolt');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Types } = Schema;

const WIN_456 = 'U ROLLED 456! U WIN!';
const MUFFINS = 'U GOT MUFFINS!';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// IDIOT - NEVER FORGET YOU ARE AN IDIOT
slack.message('idiot', async ({ say }) => {
  say('I AM IDIOT');
});

// SCORES - say the scores
slack.message(/scores/i, async ({ say }) => {
  const msg = await scores();
  say(msg);
});

// PLAY - start playing if there is no game.
slack.message(/play/i, async ({ message, client, context }) => {
  const game = await currentGame();
  if (!game.created) {
    const { ok, ts } = await client.chat.postMessage({
      token: context.botToken,
      channel: message.channel,
      text:
        'LETS PLAY CEELO. U REACT TO THIS WITH EMOJI TO PLAY. U TYPE `roll` 2 ROLL DICE',
    });
    if (ok) {
      await getPlayerBySlackId(message.user);
      game.scores.push({ playerSlackId: message.user, score: null });
      game.messageTimestamp = ts;
      game.created = true;
      await game.save();
      // Set game open after a minute
      setTimeout(async () => {
        const game = await currentGame();
        game.open = true;
        await game.save();
      }, 1000 * 60);
    }
  }
});

// ROLL - Roll the dice, start the game if the game isn't started
slack.message(/roll/i, async ({ message, client, context }) => {
  const game = await currentGame();
  const nextScore = game.scores.find((s) => s.score === null);

  if (message.user !== nextScore.playerSlackId && !game.open) return;
  game.open = false;

  // Take points from players and set stakes if game not started.
  if (!game.started) {
    await startGame(game);
  }
  await game.save();

  const resultText = await roll(game);
  await client.chat.postMessage({
    token: context.botToken,
    channel: message.channel,
    text: resultText,
  });

  setTimeout(async () => {
    const game = await currentGame();
    game.open = true;
    await game.save();
  }, 1000 * 60);
});

// REACTION ADDED - listen for reactions for the current game
slack.event('reaction_added', async ({ event }) => {
  const { user, item } = event;
  const game = await currentGame();
  if (
    !game.started &&
    item.ts === game.messageTimestamp &&
    !game.scores.some((score) => score.playerSlackId === user)
  ) {
    console.log(`adding ${user}`);
    await getPlayerBySlackId(user);
    game.scores.push({ playerSlackId: user, score: null });
    await game.save();
  }
});

// REACTION REMOVED - listen for reactions for the current
slack.event('reaction_removed', async ({ event }) => {
  const { user, item } = event;
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

const playerSchema = new Schema({
  slackId: String,
  total: { type: Number, default: 0 },
});
const Player = mongoose.model('Player', playerSchema);

const gameSchema = new Schema(
  {
    scores: [{ playerSlackId: String, score: Number }],
    created: { type: Types.Boolean, default: false },
    started: { type: Types.Boolean, default: false },
    // Whether anyone can roll the dice for a player
    open: { type: Types.Boolean, default: false },
    finished: { type: Types.Boolean, default: false },
    messageTimestamp: String,
    stakes: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Game = mongoose.model('Game', gameSchema);

const newGame = async () => {
  const game = new Game({ scores: [] });
  await game.save();
  return game;
};

const currentGame = async () => {
  const game = await Game.findOne({ finished: false }).sort('createdAt').exec();
  if (!game) return await newGame();
  return game;
};

// Takes away 1 point from each player in the game and sets the game as started.
const startGame = async (game) => {
  game.scores.forEach(async (s) => {
    const player = await Data.getPlayerBySlackId(s.playerSlackId);
    // take a point from everyone
    console.log(`taking away 1 point from ${message.user}`);
    player.total = player.total - 1;
    await player.save();
  });

  game.stakes += game.scores.length;
  game.started = true;
  return await game.save();
};

const newPlayer = async (slackId) => {
  const player = new Player({ slackId });
  await player.save();
  return player;
};

const getPlayerBySlackId = async (slackId) => {
  const player = await Player.findOne({ slackId }).exec();
  if (!player) return await newPlayer(slackId);
  return player;
};

const scores = async () => {
  const players = await Player.find({}).exec();
  const scoreText = players
    .map((player) => `<@${player.slackId}>: ${player.total}`)
    .join('\n');
  return `
  **SCORES**
  ----------- 
  ${scoreText}
  `;
};

// rolls the dice, returns the text to post.
const roll = async (game) => {
  if (game.scores.every((s) => s.score != null)) return finishGame(game);
  const score = game.scores.find((s) => s.score === null);
  let timesRolled = 0;
  let scoreText = '';
  let result = MUFFINS;
  do {
    timesRolled += 1;
    const roll = rollThree();
    result = await scoreRolls(score, roll);

    scoreText += '\n' + rollToText(roll) + ': ' + result;
    // if we got a 456
    if (result === WIN_456) {
      return await finishGame(game, scoreText);
    }
  } while (timesRolled < 5 && result === MUFFINS);
  if (timesRolled >= 5 && result === MUFFINS) {
    scoreText += '\n' + 'ROLL OUT!';
  }
  const updatedGame = await currentGame();
  const nextPlayer = updatedGame.scores.find((s) => s.score === null);
  // IDK FIXME
  if (!nextPlayer || nextPlayer.slackId === score.playerSlackId) {
    return await finishGame(updatedGame, scoreText);
  }

  return `
  ${scoreText}
  PLAYER <@${nextPlayer.playerSlackId}> UP NEXT
  `;
};

const finishGame = async (game, scoreText) => {
  game.finished = true;
  await game.save();
  // Get the top score by the numeric score.
  const topScore = game.scores.reduce((a, b) => (a.score > b.score ? a : b));
  const winningScores = game.scores.filter((s) => s.score >= topScore.score);
  if (winningScores.length > 1) {
    return push(game);
  }
  const player = await getPlayerBySlackId(topScore.playerSlackId);
  // Give the player a point for every player that put in a point
  console.log(`giving ${game.stakes} points to ${topScore.playerSlackId}`);
  player.total += game.stakes;
  await player.save();

  // return the person who won and with what.
  return `
  ${scoreText}
  PLAYER <@${topScore.playerSlackId}> WON WITH ${scoreToText(topScore.score)}
  U TYPE \`play\` 2 START NEW GAME
  `;
};

const push = async (game) => {
  const topScore = game.scores.reduce((a, b) => (a.score > b.score ? a : b));
  const winningScores = game.scores.filter((s) => s.score >= topScore.score);
  game.started = false;
  game.scores = winningScores.map((s) => ({ ...s, score: 0 }));

  return `
  PUSH!!!
  PLAYERS ${game.scores
    .map((s) => '<@' + s.playerSlackId + '>')
    .join(', ')} ARE UP NOW
  U TYPE \`roll\` 2 ROLL.`;
};

const rollToText = (die) =>
  die
    .map((d) => {
      switch (d) {
        case 1:
          return '⚀';
        case 2:
          return '⚁';
        case 3:
          return '⚂';
        case 4:
          return '⚃';
        case 5:
          return '⚄';
        case 6:
          return '⚅';
      }
      return '';
    })
    .join('');

/** Score the roll and return the display text for the roll. */
const scoreRolls = async (score, [a, b, c]) => {
  if (a === 4 && b === 5 && c === 6) {
    score.score = 456;
    await score.parent().save();
    return WIN_456;
  } else if (a === 1 && b === 2 && c === 3) {
    score.score = -123;
    await score.parent().save();
    return 'U ROLLED 123 U LOSE';
  } else if (a === b && b === c) {
    score.score = b * 10 + b;
    await score.parent().save();
    return `U ROLLED TRIPLE ${b}'s`;
  } else if (a === b || b === c) {
    score.score = a === b ? c : a;
    await score.parent().save();
    return `U ROLLED DOUBLE ${b}'s WITH A ${score.score}`;
  } else {
    score.score = 0;
    await score.parent().save();
    return MUFFINS;
  }
};

const scoreToText = (score) => {
  switch (score) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return score;
    case 11:
    case 22:
    case 33:
    case 44:
    case 55:
    case 66:
      return `TRIPLE ${score % 10}s`;
    case 456:
      return 'FOUR FIVE SIX';
    case 0:
      return 'MUFFINS';
    case -123:
      return 'ERROR: HOW U WIN WITH 123?';
  }
};

const rollThree = () => [dieRoll(), dieRoll(), dieRoll()].sort();

const dieRoll = () => Math.floor(Math.random() * 6) + 1;
