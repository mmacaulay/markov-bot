import express from 'express'
import { speak } from '../speak'

const router = express.Router()

router.post('', (req, res, next) => {
  speak((err, result) => {
    if (err) return next(err)
    res.json({ data: result })
  })
})

export default router
