import errors from './errors'
import learn from './learn'
import speak from './speak'

module.exports = (app) => {
  app.use('/health_check', (req, res, next) => {
    res.json('ok')
  })

  app.use('/learn', learn)
  app.use('/speak', speak)

  errors(app)
}
