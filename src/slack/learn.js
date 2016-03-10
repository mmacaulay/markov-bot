import config from 'config'
import request from 'request'

function learn (message) {
  const userPattern = /@[^\s]+/g
  const urlPattern = /http[s]?:\/\/[^\s]+/g

  // Don't learn usernames or URLs
  const text = message.text.replace(userPattern, '').replace(urlPattern, '')

  const req = {
    uri: `${config.slack.api}/learn`,
    json: {
      orders: config.slack.learn_orders,
      namespaces: [message.user],
      text: text
    }
  }
  request.post(req, (err, res) => {
    if (err) console.error(err)
  })
}

export default learn
