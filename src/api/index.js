import express from 'express'
import morgan from 'morgan'
import config from 'config'
import bodyParser from 'body-parser'
import fs from 'fs'

const serverConfig = config.server
const port = serverConfig.port
const app = express()

let morganOpts = {}
if (serverConfig.morgan.accessLog) {
  morganOpts.stream = fs.createWriteStream(serverConfig.morgan.accessLog, { flags: 'a' })
}

app.use(morgan(serverConfig.morgan.format, morganOpts))
app.use(bodyParser.json({ limit: '100000kb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.disable('etag')

require('./api')(app)

const server = app.listen(port, () => {
  console.log('Listening on port', port)
})

server.timeout = 300000
