import config from 'config'
import _ from 'lodash'
import { RtmClient, WebClient, RTM_EVENTS } from '@slack/client'
import learn from './learn'
import { speak, speakAs } from './speak'

const token = config.slack.token
const rtm = new RtmClient(token, { logLevel: config.slack.logLevel })
rtm.start()

const web = new WebClient(token)

let users = null
let usersAge = null
let myUsernameRe = null
const whatWouldUserSayRe = /what would ([a-zA-Z0-9_-]+) say[?]?$/i
const whatWouldUserIDSayRe = /what would <@([a-zA-Z0-9]+)> say[?]?$/i

function getUsers (callback) {
  const now = new Date().getTime()
  if (!users || (now - usersAge) > config.slack.users_max_age) {
    web.users.list((err, result) => {
      if (err) return callback(err)
      if (!result.ok) return callback(new Error(result.error))
      usersAge = new Date().getTime()
      users = result.members
      callback(null, users)
    })
  } else {
    callback(null, users)
  }
}

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  // ignore messages that have a subtype
  if (message.subtype) return

  getUsers((err, users) => {
    if (err) return console.error(err)

    const myUser = _.find(users, { name: config.slack.bot_username })
    if (!myUser) return console.error(`Unable to find my username [${config.slack.bot_username}] in user list`)
    // ignore my own messages
    if (message.user === myUser.id) return

    // messages that are addressing me might be a command (and should not be learned)
    myUsernameRe = myUsernameRe || new RegExp('^\s*<@' + myUser.id + '>[:]?')
    if (myUsernameRe.test(message.text)) {
      const command = message.text.replace(myUsernameRe, '').trim().toLowerCase()

      if (command === 'speak') {
        return speak(message.channel)
      }

      const whatWouldUserIDSayMatch = whatWouldUserIDSayRe.exec(command)
      if (whatWouldUserIDSayMatch) {
        const userId = whatWouldUserIDSayMatch[1]
        const user = _.find(users, (u) => {
          return u.id.toUpperCase() === userId.toUpperCase()
        })
        if (!user) return
        return speakAs(message.channel, user)
      }
      const whatWouldUserSayMatch = whatWouldUserSayRe.exec(command)
      if (whatWouldUserSayMatch) {
        const username = whatWouldUserSayMatch[1]
        const user = _.find(users, (u) => {
          return u.name.toUpperCase() === username.toUpperCase()
        })
        if (!user) return
        return speakAs(message.channel, user)
      }
    } else {
      learn(message)
    }
  })
})
