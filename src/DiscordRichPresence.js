import _ from 'lodash';
import crypto from 'crypto';

const _initialState = {
  details: '',
  state: '',
  timestamps: {
    start: null,
    end: null,
  },
  images: {
    large: {
      key: null,
      text: null,
    },
    small: {
      key: null,
      text: null,
    },
  },
};

class DiscordRichPresence {
  constructor(state) {
    this.reset();
    this.update(state);
  }

  static get initialState() {
    return _.cloneDeep(_initialState);
  }

  get hash() {
    return crypto.createHash('md5').update(this.toJSON(true)).digest('hex');
  }

  get presence() {
    return _.pickBy(
      {
        details: this.state.details,
        state: this.state.state,
        startTimestamp: (this.state.timestamps.start instanceof Date) ? Math.floor(this.state.timestamps.start.valueOf() / 1000) : null,
        endTimestamp: (this.state.timestamps.end instanceof Date) ? Math.floor(this.state.timestamps.end.valueOf() / 1000) : null,
        largeImageKey: this.state.images.large.key,
        largeImageText: this.state.images.large.text,
        smallImageKey: this.state.images.small.key,
        smallImageText: this.state.images.small.text,
      }
    );
  }

  reset() {
    this.update( DiscordRichPresence.initialState );
  }

  update(newState) {
    this.state = _.merge(
      this.state,
      {
        timestamps: {
          start: new Date(),
          end: null,
        },
      },
      newState
    );
  }

  toJSON(forHash = false) {
    return JSON.stringify(
      _.chain(this.presence)
      .omit(forHash ? ['startTimestamp','endTimestamp'] : [])
      .value()
    );
  }
}

export default DiscordRichPresence;
