import config from 'config'
import request from 'request'
import { WebClient } from '@slack/client'

const web = new WebClient(config.slack.token)

const qs = { order: config.slack.speak_order }

export function sendMsg (channel, msg) {
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
    else sendMsg(channel, 'Hello... world! :wave:')
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
    else sendMsg(channel, `Looks like ${user.name} is a bit of a wallflower! :hear_no_evil:`)
  })
}

export function speakAbout (channel, about) {
  qs.about = about
  const req = {
    uri: `${config.slack.api}/speak`,
    qs: qs,
    json: true
  }
  request.get(req, (err, res) => {
    if (err) console.error(err)
    const text = res.body.data
    if (text) sendMsg(channel, text)
    else sendMsg(channel, `"${about}"? Never heard of it. :poop:`)
  })
}

export function speakAsAbout (channel, user, about) {
  qs.namespace = user.id
  qs.about = about
  const req = {
    uri: `${config.slack.api}/speak`,
    qs: qs,
    json: true
  }
  request.get(req, (err, res) => {
    if (err) console.error(err)
    const text = res.body.data
    if (text) sendMsg(channel, text)
    else sendMsg(channel, `${user.name} has nothing to say on the subject. :no_mouth:`)
  })
}
