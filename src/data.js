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
    finished: { type: Types.Boolean, default: false },
    messageTimestamp: String,
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
  try {
    const game = await Game.findOne({ finished: false })
      .sort('createdAt')
      .exec();
    if (!game) return await newGame();
    return game;
  } catch (e) {
    return await newGame();
  }
};

const newPlayer = async (slackId) => {
  const player = new Player({ slackId });
  await player.save();
  return player;
};

exports.getPlayerBySlackId = async (slackId) => {
  try {
    const player = await Player.findOne({ slackId }).exec();
    if (!player) return await newPlayer(slackId);
    return player;
  } catch (e) {
    return await newPlayer(slackId);
  }
};
