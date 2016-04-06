import config from 'config'
import request from 'request'

function learn (text, userId) {
  const req = {
    uri: `${config.slack.api}/learn`,
    json: {
      orders: config.slack.learn_orders,
      namespaces: [userId],
      text: text
    }
  }
  request.post(req, (err, res) => {
    if (err) console.error(err)
  })
}

export default learn
