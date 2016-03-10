import config from 'config'
import request from 'request'
import { WebClient } from '@slack/client'

const web = new WebClient(config.slack.token)

const qs = { order: config.slack.speak_order }

function sendMsg (channel, msg) {
  web.chat.postMessage(channel, msg, { as_user: true })
}

export function speak (channel) {
  const req = {
    uri: `${config.slack.api}/speak`,
    qs: qs,
    json: true
  }
  request.get(req, (err, res) => {
    if (err) console.error(err)
    const text = res.body.data
    if (text) sendMsg(channel, text)
    else sendMsg(channel, 'Hello... world!')
  })
}

export function speakAs (channel, user) {
  qs.namespace = user.id
  const req = {
    uri: `${config.slack.api}/speak`,
    qs: qs,
    json: true
  }
  request.get(req, (err, res) => {
    if (err) console.error(err)
    const text = res.body.data
    if (text) sendMsg(channel, text)
    else sendMsg(channel, `Looks like ${user.name} is a bit of a wallflower!`)
  })
}
