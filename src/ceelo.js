expots.roll = (game, player) => ({});

exports.init = (players) => ({
  players,
  currentPlayer: players[0],
  scores: [],
});
