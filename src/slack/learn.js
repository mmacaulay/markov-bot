import config from 'config'
import request from 'request'

function learn (message) {
  // Don't learn usernames
  const userPattern = /@[^\s]+/g
  // Or URLs
  const urlPattern = /http[s]?:\/\/[^\s]+/g

  const text = message.text.replace(userPattern, '').replace(urlPattern, '')

  const req = {
    uri: `${config.slack.api}/learn`,
    json: {
      orders: config.slack.orders,
      namespaces: [message.user],
      text: text
    }
  }
  request.post(req, (err, res) => {
    if (err) console.error(err)
  })
}

export default learn
