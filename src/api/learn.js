import express from 'express'
import learn from '../learn'

const router = express.Router()

router.post('', (req, res, next) => {
  const orders = req.body.orders || [1]
  const namespaces = req.body.namespaces || []
  learn(req.body.text, { orders: orders, namespaces: namespaces }, (err) => {
    if (err) return next(err)
    res.json('ok')
  })
})

export default router
