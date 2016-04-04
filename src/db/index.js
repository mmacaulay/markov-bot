import config from 'config'

const es = require('./elasticsearch')
const redis = require('./redis')

if (config.db === 'elasticsearch') {
  module.exports = es
} else {
  module.exports = redis
}
