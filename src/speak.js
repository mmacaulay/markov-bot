import _ from 'lodash'
import db from './db'

export function speak (order, callback) {
  if (arguments.length === 1) {
    callback = order
    order = 1
  }
  const store = db('all', order)

  function assemble (terms) {
    return terms.map((term) => {
      return term.text
    }).join(' ')
  }

  function createSentence (term, termsCollected, callback) {
    if (!term) return callback(null, assemble(termsCollected))

    store.nextStates(term, (err, states) => {
      if (err) return callback(err)
      const terms = states ? termsCollected.concat(states) : termsCollected
      const nextTerm = states ? _.last(states) : null
      createSentence(nextTerm, terms, callback)
    })
  }

  store.getStartTerm((err, startTerm) => {
    if (err) return callback(err)
    if (!startTerm) return callback(null, null)
    createSentence(startTerm, [startTerm], callback)
  })
}
