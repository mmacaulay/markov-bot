import config from 'config'
import { RtmClient, RTM_EVENTS } from '@slack/client'
import learn from './learn'

const token = config.slack.token
const rtm = new RtmClient(token, { logLevel: config.slack.logLevel })
rtm.start()

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  // ignore messages that have a subtype
  if (message.subtype) return
  learn(message)
})
