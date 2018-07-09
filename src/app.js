import _ from 'lodash';
import DiscordRPC from 'discord-rpc';
import tasklist from 'tasklist';
import util from 'util';

import DiscordRichPresence from './DiscordRichPresence';

const applicationID = process.env.DISCORD_APP_ID || null;
const updateInterval = process.env.DISCORD_STATUS_UPDATE_INTERVAL || 15 * 1000;
const imageKeyLarge = process.env.DISCORD_APP_IMAGE || 'anime_nerv';
const mpvTitlePattern = /^\[mpv\] (?:file: )?(.+)$/;
const episodePattern = /(\s*-\s*)?(\d+)(\S*)$/;
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let updateTimeout = null;
const richPresence = new DiscordRichPresence();

rpc.on('ready', () => {
  console.log(`Logged in as ${rpc.user.username}.`);
  checkUpdateStatus();
});

rpc.on('close', () => {
  rpc.clearActivity();
  console.log('disconnected');
});

const findMPVWindowTitle = async () => {
  const mpvTasks = await tasklist({verbose: true, filter: ['IMAGENAME eq mpv.exe']});
  return _.get(mpvTasks, '[0].windowTitle', '');
}

const checkUpdateStatus = async () => {
  const mpvTitle = await findMPVWindowTitle();
  const titleMatch = mpvTitle.match(mpvTitlePattern);
  const mediaTitle = _.get(titleMatch, '[1]', '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^\)]*(720|1080)[^\)]*\)/gi, '')
    .replace(/(\s|_)/g, ' ')
    .trim()
  ;

  if (!mediaTitle || mediaTitle === 'No file') {
    // no media
    if (richPresence.presence.details) {
      // clear presence
      console.log('No media found, clearing presence.');
      richPresence.reset();
      rpc.clearActivity();
    }
  }
  else {
    // media found
    const episodeMatch = mediaTitle.match(episodePattern);
    const episodeTitle = episodeMatch ? mediaTitle.replace(episodeMatch[0], '') : mediaTitle;
    const episodeNumber = episodeMatch ? `Episode: ${parseInt(episodeMatch[2], 10)}` : null;
    const presenceDetails = {
      details: episodeTitle,
      state: episodeNumber,
      largeImageKey: imageKeyLarge,
    };

    const newPresence = new DiscordRichPresence(presenceDetails);

    if (richPresence.hash !== newPresence.hash) {
      // media change detected
      console.log('Media changed. Updating presence.');
      richPresence.update(presenceDetails);
      console.log(richPresence.toJSON());
      rpc.setActivity(richPresence.presence);
    }
  }

  updateTimeout = setTimeout(checkUpdateStatus, updateInterval);
}

process.on('SIGINT', () => {
  console.log('caught SIGINT');
  if (updateTimeout) {
    console.log('clearing timeout');
    clearTimeout(updateTimeout);
  }
  console.log('clearing activity/presence');
  rpc.clearActivity();
  console.log('destroying/disconnecting');
  rpc.destroy();
  console.log('exiting');
  process.exit();
});

if (!applicationID) {
  console.log('you must supply application ID in the DISCORD_APP_ID environment variable');
} else {
  console.log('starting up / logging in');
  rpc
    .login(applicationID)
    .catch(console.error)
  ;
}
