import express from 'express'
import { speak } from '../speak'

const router = express.Router()

router.get('', (req, res, next) => {
  const order = req.query.order || 1
  const namespace = req.query.namespace
  speak({ order: order, namespace: namespace }, (err, result) => {
    if (err) return next(err)
    res.json({ data: result })
  })
})

export default router
