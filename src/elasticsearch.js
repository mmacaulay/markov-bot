var config = require('config')
var elasticsearch = require('elasticsearch')

export function createClient () {
  return new elasticsearch.Client({
    hosts: config.elasticsearch.hosts,
    sniffOnStart: true,
    log: config.elasticsearch.log_level,
    apiVersion: '2.2'
  })
}
