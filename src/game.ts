import { DocumentType } from '@typegoose/typegoose';
import { SayFn } from '@slack/bolt';
import { GameClass, Game, Player } from './models';
import { range, equals } from 'ramda';

const WIN_456 = 'U ROLLED 456! U WIN!';
const MUFFINS = 'U GOT MUFFINS!';

type DiceRoll = [number, number, number];

export const scores = async () => {
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

export const createGame = async (
  game: DocumentType<GameClass>,
  ts: string,
  playerSlackId: string
) => {
  // lets go ahead and save IMMEDIATELY CUZ WE DONT WANNA MAKE TWO GAMES UGH HEROKU
  game.state = 'created';
  await game.save();
  await getPlayerBySlackId(playerSlackId);
  game.scores.push({ playerSlackId, value: null });
  game.messageTimestamp = ts as string;
  await game.save();
  // Set game open after a minute
  setTimeout(async () => {
    const game = await currentGame();
    game.open = true;
    await game.save();
  }, 1000 * 60);
};

export const currentGame = async () => {
  const game = await Game.findOne({ finished: false }).sort('createdAt').exec();
  if (!game) return await newGame();
  return game;
};

const newGame = async () => {
  const game = new Game({ scores: [] });
  await game.save();
  return game;
};

export const getPlayerBySlackId = async (slackId: string) => {
  const player = await Player.findOne({ slackId }).exec();
  if (!player) return await newPlayer(slackId);
  return player;
};

const newPlayer = async (slackId: string) => {
  const player = new Player({ slackId });
  await player.save();
  return player;
};

// Respond to a `roll` command
export const roll = async (
  game: DocumentType<GameClass>,
  say: SayFn,
  slackId: string
) => {
  // Welcome to the most imperative shit i've ever done
  // get the next roll (the next score in the game without a value
  const score = game.scores.find((s) => s.value === null);
  // If the command wasn't issued by the next player or if the game hasn't been
  // opened by the 1 minute timout, just return null and do nothing
  if (slackId !== score?.playerSlackId && !game.open) return null;
  // This should not happen, but if someone types `roll` and everyone has
  // already scored, the game should just end so we do that here.
  if (!score || game.scores.every((s) => s.value != null))
    return say(await finishGame(game, ''));
  // Okay, end of race conditions lets actually roll. Close the game first.
  game.open = false;
  // If it ain't started, get it going.
  if (!game.started) {
    await startGame(game);
  }
  await game.save();
  // Okay time to actually roll, lil setup
  let scoreText = `PLAYER <@${score.playerSlackId}> IS UP`;
  let result;

  // Roll five times (break if we got a score)
  for (const i of range(0, 5)) {
    const roll = rollThree();
    const [a, b, c] = roll;

    if (equals([4, 5, 6], roll)) {
      score.value = 456;
      result = WIN_456;
    } else if (a === 1 && b === 2 && c === 3) {
      score.value = -123;
      result = 'U ROLLED 123 U LOSE';
    } else if (a === b && b === c) {
      score.value = b * 10 + b;
      result = `U ROLLED TRIPLE ${b}'s`;
    } else if (a === b || b === c) {
      score.value = a === b ? c : a;
      result = `U ROLLED DOUBLE ${b}'s WITH A ${score.value}`;
    } else {
      score.value = 0;
      result = MUFFINS;
    }
    // lets save it
    await game.save();

    scoreText += '\n' + rollToText(roll) + ': ' + result;
    // if we got a 456 we got a winner.
    if (result === WIN_456) {
      return say(await finishGame(game, scoreText));
    } else if (!equals([0, 0, 0], roll)) {
      break;
    } else if (i >= 5) {
      scoreText += '\n' + 'ROLL OUT!';
      break;
    }
  }
  const nextPlayer = game.scores.find((s) => s.value === null);
  // IDK FIXME something weird about looping around it or something
  if (!nextPlayer || nextPlayer.playerSlackId === score.playerSlackId) {
    return say(await finishGame(game, scoreText));
  }

  say(`
  ${scoreText}
  PLAYER <@${nextPlayer.playerSlackId}> UP NEXT
  `);

  setTimeout(async () => {
    const game = await currentGame();
    game.open = true;
    await game.save();
  }, 1000 * 60);
};

const startGame = async (game: DocumentType<GameClass>) => {
  game.scores.forEach(async (s) => {
    const player = await getPlayerBySlackId(s.playerSlackId);
    // take a point from everyone
    player.total = player.total - 1;
    await player.save();
  });

  game.stakes += game.scores.length;
  game.state = 'started';
  return await game.save();
};

const finishGame = async (
  game: DocumentType<GameClass>,
  scoreText: string = ''
) => {
  const topScore = Math.max(...game.scores.map(({ value }) => value || 0));
  const winners = game.scores.filter((s) => s.value === topScore);
  if (winners.length > 1) {
    return scoreText + (await push(game));
  }
  game.state = 'finished';
  await game.save();
  const player = await getPlayerBySlackId(winners[0].playerSlackId);
  // Give the player a point for every player that put in a point
  console.log(`giving ${game.stakes} points to ${player.slackId}`);
  player.total += game.stakes;
  await player.save();

  // return the person who won and with what.
  return `
  ${scoreText}
  PLAYER <@${player.slackId}> WON WITH ${scoreToText(topScore)}
  U TYPE \`play\` 2 START NEW GAME
  `;
};

const push = async (game: DocumentType<GameClass>) => {
  const topScore = Math.max(...game.scores.map((s) => s.value || 0));
  const winners = game.scores.filter((s) => s.value === topScore);
  game.scores = winners.map((s) => ({ ...s, score: 0 }));
  await game.save();

  return `
  PUSH!!!
  PLAYERS ${game.scores
    .map((s) => '<@' + s.playerSlackId + '>')
    .join(', ')} ARE UP NOW
  U TYPE \`roll\` 2 ROLL.`;
};

const rollToText = (die: DiceRoll) =>
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

const scoreToText = (score: number) => {
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

const rollThree = (): DiceRoll =>
  [dieRoll(), dieRoll(), dieRoll()].sort() as DiceRoll;

const dieRoll = (): number => Math.floor(Math.random() * 6) + 1;
