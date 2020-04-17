require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Types } = Schema;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
    stakes: {type: Number, default: 0},
  },
  { timestamps: true }
);
const Game = mongoose.model('Game', gameSchema);

const newGame = async () => {
  const game = new Game({ scores: [] });
  await game.save();
  return game;
};

exports.currentGame = async () => {
  const game = await Game.findOne({ finished: false })
    .sort('createdAt')
    .exec();
  if (!game) return await newGame();
  return game;
};

// Takes away 1 point from each player in the game and sets the game as started.
exports.startGame = (game) => {
  game.scores.forEach(async (s) => {
    const player = await Data.getPlayerBySlackId(s.playerSlackId);
    // take a point from everyone
    console.log(`taking away 1 point from ${message.user}`);
    player.total = player.total - 1;
    await player.save();
  });

  game.stakes += game.scores.length
  game.started = true;
  return await game.save()
}

const newPlayer = async (slackId) => {
  const player = new Player({ slackId });
  await player.save();
  return player;
};

exports.getPlayerBySlackId = async (slackId) => {
  const player = await Player.findOne({ slackId }).exec();
  if (!player) return await newPlayer(slackId);
  return player;
};

exports.scores = async () => {
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
