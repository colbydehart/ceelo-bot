const Data = require('./data');

const WIN_456 = 'U ROLLED 456! U WIN!';
const MUFFINS = 'U GOT MUFFINS!';

// rolls the dice, returns the text to post.
exports.roll = async (game) => {
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
  if (timesRolled >= 5 && result === MUFFINS) {
    scoreText += '\n' + 'ROLL OUT!';
  }
  const updatedGame = await Data.currentGame();
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
  // possible scores: {456,66..11,6..1,0,-123}
  let topScore = game.scores.reduce((a, b) => (a.score > b.score ? a : b));
  const player = await Data.getPlayerBySlackId(topScore.playerSlackId);
  // Give the player a point for every player that put in a point
  console.log(
    `giving ${game.scores.length} points to ${topScore.playerSlackId}`
  );
  player.total += game.scores.length;
  await player.save();

  // return the person who won and with what.
  return `
  ${scoreText}
  PLAYER <@${topScore.playerSlackId}> WON WITH ${scoreToText(topScore.score)}
  U TYPE \`play\` 2 START NEW GAME
  `;
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
