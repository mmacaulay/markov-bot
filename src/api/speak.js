import express from 'express'
import { speak } from '../speak'

const router = express.Router()

router.get('', (req, res, next) => {
  const order = req.query.order || 1
  speak(order, (err, result) => {
    if (err) return next(err)
    res.json({ data: result })
  })
})

export default router
