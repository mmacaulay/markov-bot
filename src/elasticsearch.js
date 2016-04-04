var config = require('config')
var elasticsearch = require('elasticsearch')

export function createClient () {
  return new elasticsearch.Client({
    host: config.elasticsearch.host,
    log: config.elasticsearch.log_level,
    apiVersion: '2.2'
  })
}
