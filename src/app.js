import _ from 'lodash';
import Discord from 'discord.js';
import tasklist from 'tasklist';

const userToken = process.env.DISCORD_USER_TOKEN || '';
const updateInterval = process.env.DISCORD_STATUS_UPDATE_INTERVAL || 10 * 1000;
const mpvTitlePattern = /^\[mpv\] (?:file: )?(.+)$/;
const client = new Discord.Client();

let updateTimeout = null;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  checkUpdateStatus();
});

client.on('disconnect', () => {
  console.log('disconnected');
});

const findMPVWindowTitle = async () => {
  const mpvTasks = await tasklist({verbose: true, filter: ['IMAGENAME eq mpv.exe']});
  return _.get(mpvTasks, '[0].windowTitle', '');
}

const checkUpdateStatus = async () => {
  const clientStatus = _.get(client, 'user.presence.game.name', '');
  const mpvTitle = await findMPVWindowTitle();
  const titleMatch = mpvTitle.match(mpvTitlePattern);
  const mediaStatus = _.get(titleMatch, '[1]', '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^\)]*(720|1080)[^\)]*\)/gi, '')
    .replace(/(\s|_)/g, ' ')
    .trim()
  ;

  if (mediaStatus && (mediaStatus !== clientStatus)) {
    // update status
    console.log(`updating status: ${mediaStatus}`);
    client.user.setPresence({ game: { name: mediaStatus, type: 'WATCHING' } });
  } else if (!mediaStatus && clientStatus) {
    // clear status
    console.log('clearing status');
    client.user.setPresence({ game: null });
  }

  updateTimeout = client.setTimeout(checkUpdateStatus, updateInterval);
}

process.on('SIGINT', () => {
  console.log('caught SIGINT');
  if (updateTimeout) {
    console.log('clearing timeout');
    client.clearTimeout(updateTimeout);
  }
  const clientStatus = _.get(client, 'user.presence.game.name', '');
  if (clientStatus) {
    console.log('clearing status');
    client.user.setPresence({ game: null });
  }
  console.log('exiting');
  process.exit();
});

if (! userToken) {
  console.log('you must supply a user token in the DISCORD_USER_TOKEN environment variable');
} else {
  client.login(userToken);
}
