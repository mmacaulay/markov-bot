module.exports = (app) => {
  app.use('/', (req, res, next) => {
    res.json('Ok')
  })
}
