import { config } from 'dotenv';
config();
import { MongoClient } from 'mongodb';

export let client: MongoClient | null = null;
MongoClient.connect(process.env.MONGODB_URI).then((db) => {
  client = db;
});

// mongoose.connect(process.env.MONGODB_URI);

// const playerSchema = new Schema({
//   slackId: String,
//   total: { type: Number, default: 0 },
// });
// export const Player = mongoose.model('Player', playerSchema);

// const gameSchema = new Schema({
//   scores: [{ player: Types.ObjectId, score: String }],
//   started: Types.Boolean,
// });
// export const Game = mongoose.model('Game', gameSchema);
