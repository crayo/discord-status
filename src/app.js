import _ from 'lodash';
import Discord from 'discord.js';
import tasklist from 'tasklist';

const userToken = process.env.DISCORD_USER_TOKEN || '';
const updateInterval = process.env.DISCORD_STATUS_UPDATE_INTERVAL || 10 * 1000;
const mpvTitlePattern = /^\[mpv\] (?:file: )?(.+)$/;

const client = new Discord.Client();

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
  const mpvTitle = await findMPVWindowTitle();
  const titleMatch = mpvTitle.match(mpvTitlePattern);
  const clientStatus = _.get(client, 'user.presence.game.name', '');
  let mediaStatus = '';
  if (titleMatch && titleMatch[1] && titleMatch[1] !== 'No file') {
    console.log(`found media: ${titleMatch[1]}`);
    mediaStatus = titleMatch[1]
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^\)]*(720|1080)[^\)]*\)/gi, '')
      .replace(/(\s|_)/g, ' ')
      .trim()
    ;
  }

  console.log('Parsed:');
  console.log(`  media : "${mediaStatus}"`);
  console.log(`  client: "${clientStatus}"`);

  if (mediaStatus && (mediaStatus !== clientStatus)) {
    // update status
    console.log('  updating to media status');
    client.user.setPresence({ game: { name: mediaStatus } });
  } else if (!mediaStatus && clientStatus) {
    // clear status
    console.log('  clearing status');
    client.user.setPresence({ game: null });
  } else {
    console.log('  doing nothing');
  }

  client.setTimeout(checkUpdateStatus, updateInterval);
}

if (! userToken) {
  console.log('you must supply a user token in the DISCORD_USER_TOKEN environment variable');
} else {
  client.login(userToken);
}
