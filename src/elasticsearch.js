import config from 'config'
import elasticsearch from 'elasticsearch'

// Elasticsearch hosts may be configured as an environment variable,
// in which case it will be a string, so we parse it if necessary.
const hosts = Array.isArray(config.elasticsearch.hosts)
                ? config.elasticsearch.hosts
                : JSON.parse(config.elasticsearch.hosts)

export function createClient () {
  return new elasticsearch.Client({
    hosts: hosts,
    sniffOnStart: true,
    log: config.elasticsearch.log_level,
    apiVersion: '2.2'
  })
}
