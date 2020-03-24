require('dotenv').config();
const Bolt = require('@slack/bolt');

const slack = new Bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

slack.message('idiot', ({ say }) => {
  say('I AM IDIOT');
});

// slack.event('reaction_added', (/*{ event, context }*/) => {
// TODO handle reactions to the initial message
// });

console.log('🚀 STARTING...');
slack.start(process.env.PORT || 3000);
