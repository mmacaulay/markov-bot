import express from 'express'
import learn from '../learn'

const router = express.Router()

router.post('', (req, res, next) => {
  learn(req.body.text, (err) => {
    if (err) return next(err)
    res.json('ok')
  })
})

export default router
