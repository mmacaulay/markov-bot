import errors from './errors'
import learnings from './learnings'
import pontifications from './pontifications'

module.exports = (app) => {
  app.use('/health_check', (req, res, next) => {
    res.json('ok')
  })

  app.use('/learnings', learnings)
  app.use('/pontifications', pontifications)

  errors(app)
}
