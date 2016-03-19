import express from 'express'
import morgan from 'morgan'
import config from 'config'
import bodyParser from 'body-parser'
import fs from 'fs'

const apiConfig = config.api
const port = apiConfig.port
const app = express()

let morganOpts = {}
if (apiConfig.morgan.accessLog) {
  morganOpts.stream = fs.createWriteStream(apiConfig.morgan.accessLog, { flags: 'a' })
}

app.use(morgan(apiConfig.morgan.format, morganOpts))
app.use(bodyParser.json({ limit: '100000kb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.disable('etag')

require('./api')(app)

const server = app.listen(port, () => {
  console.log('Listening on port', port)
})

server.timeout = 300000
