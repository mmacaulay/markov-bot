import config from 'config'
import _ from 'lodash'
import { RtmClient, WebClient, RTM_EVENTS } from '@slack/client'
import learn from './learn'
import { sendMsg, speak, speakAs, speakAbout, speakAsAbout } from './speak'

const token = config.slack.token
const rtm = new RtmClient(token, { logLevel: config.slack.logLevel })
rtm.start()

const web = new WebClient(token)

let users = null
let usersAge = null
let myUsernameRe = null
const whatWouldUserIDSayRe = /what would <@([a-zA-Z0-9]+)> say[?]?$/i
const whatWouldUserSayRe = /what would (.+) say[?]?$/i
const whatWouldUserIDSayAboutRe = /what would <@([a-zA-Z0-9]+)> say about ([^?]*)[?]*/i
const whatWouldUserSayAboutRe = /what would (.+) say about ([^?]*)[?]*/i
const tellMeAboutRe = /tell me about ([^?]*)/i

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

      if (command === 'help') {
        return sendMsg(message.channel, [":information_desk_person: Here's what's up:",
        ':speech_balloon: *what would <user> say?* - say something in the voice of <user>',
        ':speech_balloon: *tell me about <thing>* - say something insightful about <thing>',
        ':speech_balloon: *what would <user> say about <thing>?* - learn how <user> really feels about <thing>'].join('\n'))
      }

      const whatWouldUserIDSayAboutMatch = whatWouldUserIDSayAboutRe.exec(command)
      if (whatWouldUserIDSayAboutMatch) {
        const userId = whatWouldUserIDSayAboutMatch[1]
        const user = _.find(users, (u) => {
          return u.id.toUpperCase() === userId.toUpperCase()
        })
        if (!user) return sendMsg(message.channel, `I don't know any user ID: "${userId}"`)
        const about = whatWouldUserIDSayAboutMatch[2]
        return speakAsAbout(message.channel, user, about)
      }

      const whatWouldUserSayAboutMatch = whatWouldUserSayAboutRe.exec(command)
      if (whatWouldUserSayAboutMatch) {
        const username = whatWouldUserSayAboutMatch[1]
        const user = _.find(users, (u) => {
          return u.name.toUpperCase() === username.toUpperCase()
        })
        if (!user) return sendMsg(message.channel, `I don't know any "${username}"`)
        const about = whatWouldUserSayAboutMatch[2]
        return speakAsAbout(message.channel, user, about)
      }

      const whatWouldUserIDSayMatch = whatWouldUserIDSayRe.exec(command)
      if (whatWouldUserIDSayMatch) {
        const userId = whatWouldUserIDSayMatch[1]
        const user = _.find(users, (u) => {
          return u.id.toUpperCase() === userId.toUpperCase()
        })
        if (!user) return sendMsg(message.channel, `I don't know any user ID: "${userId}"`)
        return speakAs(message.channel, user)
      }

      const whatWouldUserSayMatch = whatWouldUserSayRe.exec(command)
      if (whatWouldUserSayMatch) {
        const username = whatWouldUserSayMatch[1]
        const user = _.find(users, (u) => {
          return u.name.toUpperCase() === username.toUpperCase()
        })
        if (!user) return sendMsg(message.channel, `I don't know any "${username}"`)
        return speakAs(message.channel, user)
      }

      const tellMeAboutMatch = tellMeAboutRe.exec(command)
      if (tellMeAboutMatch) {
        const about = tellMeAboutMatch[1]
        return speakAbout(message.channel, about)
      }

      // default action when addressed is just speak.
      speak(message.channel)
    } else {
      learn(message)
    }
  })
})
