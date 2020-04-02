const Data = require('./data');

const WIN_456 = 'YOU ROLLED 456 YOU WIN';
const MUFFINS = 'YOU GOT MUFFINS!';

// rolls the dice, returns the text to post.
exports.roll = async (game) => {
  if (game.scores.every((s) => s.score != null)) return finishGame(game);
  const score = game.scores.find((s) => s.score === null);
  let timesRolled = 0;
  let scoreText = '';
  let result = MUFFINS;
  while (timesRolled < 5 && result === MUFFINS) {
    timesRolled += 1;
    result = scoreRolls(score, rollThree());

    scoreText += '\n' + result;
    // if we got a 456
    if (result === WIN_456) {
      return await finishGame(game, scoreText);
    }
  }
  const updatedGame = await Data.currentGame();
  const nextPlayer = updatedGame.scores.find((s) => s.score === null);
  if (!nextPlayer) {
    return await finishGame(updatedGame, scoreText);
  }
  return ```
  ${scoreText}
  Player <@${nextPlayer.playerSlackId}> is up next
  ```;
};

const finishGame = async (game, scoreText) => {
  game.finished = true;
  await game.save();
  // Get the top score by the numeric score.
  // possible scores: {456,66..11,6..1,0,-123}
  let topScore = games.scores.reduce((a, b) => (a.score > b.score ? a : b));
  const player = Data.getPlayerBySlackId(topScore.playerSlackId);
  // Give the player a point for every player that put in a point
  player.total += game.scores.length;
  await player.save();

  // return the person who won and with what.
  return ```
  ${scoreText}
  player <@${topScore.playerSlackId}> won with a score of ${topScore.score}
  ```;
};

/** Score the roll and return the display text for the roll. */
const scoreRolls = async (score, [a, b, c]) => {
  if (a === 4 && b === 5 && c === 6) {
    score.score = 456;
    await score.parent().save();
    return WIN_456;
  } else if (a === 1 && b === 2 && c === 3) {
    score.score = -123;
    await score.parent().save();
    return 'YOU ROLLED 123 YOU LOSE';
  } else if (a === b && b === c) {
    score.score = b * 10 + b;
    await score.parent().save();
    return `YOU ROLLED TRIPLE ${b}'s'`;
  } else if (a === b || b === c) {
    score.score = b;
    await score.parent().save();
    return `YOU ROLLED DOUBLE ${b}'s'`;
  } else {
    score.score = 0;
    await score.parent().save();
    return MUFFINS;
  }
};

const rollThree = () => [dieRoll(), dieRoll(), dieRoll()].sort();

const dieRoll = () => Math.floor(Math.random() * 6) + 1;
