import errors from './errors'

module.exports = (app) => {
  app.use('/health_check', (req, res, next) => {
    res.json('ok')
  })

  errors(app)
}
