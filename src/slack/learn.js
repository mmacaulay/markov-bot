import config from 'config'
import request from 'request'

function learn (message) {
  const req = {
    uri: `${config.slack.api}/learn`,
    json: {
      orders: config.slack.orders,
      namespaces: [message.user],
      text: message.text
    }
  }
  request.post(req, (err, res) => {
    if (err) console.error(err)
  })
}

export default learn
