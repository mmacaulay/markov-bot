import redis from 'redis'
import config from 'config'

const host = config.server.redis.host
const port = config.server.redis.port
const database = config.server.redis.database
const client = redis.createClient(port, host)

if (database) {
  client.select(database)
}

export default client
