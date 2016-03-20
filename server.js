var argv = require('yargs').argv

var slackPath = './lib/slack'
var apiPath = './lib/api'

var requires = []

if (argv.slack) {
  requires.push(slackPath)
}

if (argv.api) {
  requires.push(apiPath)
}

if (!requires.length) {
  requires.push(slackPath)
  requires.push(apiPath)
}

requires.forEach(function (req) {
  require(req)
})
