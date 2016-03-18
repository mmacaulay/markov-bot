import async from 'async'
import { assert } from 'chai'
import redis from '../../src/redis'

export function assertHasChains (chains, callback) {
  const fns = chains.map((chain) => {
    return (cb) => {
      redis.zscan([chain.key, 0], (err, result) => {
        if (err) return cb(err)
        assert.equal(result[1][1], chain.score, `${chain.key} score`)

        const value = JSON.parse(result[1][0])
        value.forEach((term) => {
          assert.isTrue(chain.terms.indexOf(term.text) > -1)
        })
        cb()
      })
    }
  })

  async.parallel(fns, callback)
}
