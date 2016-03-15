import _ from 'lodash'
import async from 'async'
import db from './db'
import nlp from 'nlp_compromise'

const defaultOpts = {
  order: 1,
  namespace: 'all'
}

function assemble (terms) {
  return terms.map((term) => {
    return term.text
  }).join(' ')
}

function createSentence (store, term, termsCollected, callback) {
  if (!term) return callback(null, termsCollected)

  store.nextStates(term, (err, states) => {
    if (err) return callback(err)
    const terms = states ? termsCollected.concat(states) : termsCollected
    const nextTerm = states ? _.last(states) : null
    createSentence(store, nextTerm, terms, callback)
  })
}

export function speak (opts, callback) {
  if (arguments.length === 1) {
    callback = opts
    opts = defaultOpts
  }
  opts = opts || {}
  const order = opts.order || 1
  const namespace = opts.namespace || 'all'
  const store = db(namespace, order)

  store.getStartTerm((err, startTerm) => {
    if (err) return callback(err)
    if (!startTerm) return callback(null, null)
    createSentence(store, startTerm, [startTerm], (err, terms) => {
      if (err) return callback(err)
      callback(null, assemble(terms))
    })
  })
}

export function speakAbout (thing, opts, callback) {
  if (arguments.length === 2) {
    callback = opts
    opts = defaultOpts
  }
  opts = opts || {}
  const order = opts.order || 1
  const namespace = opts.namespace || 'all'
  const term = nlp.term(thing)

  const store = db(namespace, order)
  const reverseStore = db(`reverse:${namespace}`, order)

  async.parallel({
    reverseChain: (cb) => {
      createSentence(reverseStore, term, [], cb)
    },
    forwardChain: (cb) => {
      createSentence(store, term, [], cb)
    }
  }, (err, result) => {
    if (err) return callback(err)
    const reverseTerms = result.reverseChain.slice().reverse()
    const terms = reverseTerms.concat([term, ...result.forwardChain])
    if (terms.length === 1) {
      callback(null, null)
    } else {
      callback(null, assemble(terms))
    }
  })
}
