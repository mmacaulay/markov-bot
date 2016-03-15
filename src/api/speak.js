import express from 'express'
import { speak, speakAbout } from '../speak'

const router = express.Router()

router.get('', (req, res, next) => {
  const opts = {
    order: req.query.order || 1,
    namespace: req.query.namespace
  }
  const about = req.query.about
  const handler = (err, result) => {
    if (err) return next(err)
    res.json({ data: result })
  }
  if (about) {
    speakAbout(about, opts, handler)
  } else {
    speak(opts, handler)
  }
})

export default router
