import dotenv from 'dotenv';
dotenv.config();
import Bolt from '@slack/bolt';

const app = new Bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.message('idiot', ({ say }) => {
  say('I AM IDIOT');
});

app.message('ceelo', ({ say }) => {
  say('I AM IDIOT');
});

app.event('reaction_added', ({ event, context }) => {
  console.log(event);
  console.log(context);
});

console.log('⚡️ Starting Bolt app!');
app.start(process.env.PORT || 3000);

