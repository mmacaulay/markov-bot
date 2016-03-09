import config from 'config'
import { RtmClient, RTM_EVENTS } from '@slack/client'
import learn from './learn'

const token = config.slack.token
const rtm = new RtmClient(token, { logLevel: config.slack.logLevel })
rtm.start()

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  // ignore messages that have a subtype
  if (message.subtype) return

  // don't learn messages that are addressing me
  const botUsernamePattern = new RegExp('^\s*[@]?' + config.slack.bot_username + '[:]?')
  if (!botUsernamePattern.test(message.text)) {
    learn(message)
  }
})
