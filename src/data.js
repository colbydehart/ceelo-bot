const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const players = async () => await redis.smembers('players');
const addPlayer = async (player) => await redis.sadd('players', player);
const removePlayer = async (player) => await redis.srem('players', player);

const currentPlayer = async () => await redis.get('currentPlayer');

const game = () => await redis.hgetall('game');

const isPlaying = async () => parseInt(await redis.get('playing'));

const initializeGame = async (messageTimestamp, user) =>
  await redis
    .multi()
    .del('players')
    .del('game')
    .sadd('players', [user])
    .set('playing', 1)
    .set('letsPlayMessage', messageTimestamp)
    .set('currentPlayer', user)
    .exec();

const letsPlayMessage = async () => await redis.get('letsPlayMessage');

const init = async () => {
  await redis.set('playing', false);
};

module.exports = {
  addPlayer,
  currentPlayer,
  game,
  init,
  initializeGame,
  isPlaying,
  letsPlayMessage,
  players,
  removePlayer,
};
