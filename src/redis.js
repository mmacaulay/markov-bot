import redis from 'redis'
import config from 'config'

const host = config.redis.host
const port = config.redis.port
const database = config.redis.database
const client = redis.createClient(port, host)

if (database) {
  client.select(database)
}

export default client
