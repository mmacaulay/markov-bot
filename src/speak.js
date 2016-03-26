import _ from 'lodash'
import async from 'async'
import db from './db'
import nlp from 'nlp_compromise'
import natural from 'natural'

const defaultOpts = {
  order: 1,
  namespace: 'all'
}

function assemble (terms) {
  return terms.map((term) => {
    return term.text
  }).join(' ')
}

function createSentence (store, termsCollected, callback) {
  const term = _.last(termsCollected)
  if (!term) return callback(null, termsCollected)

  store.nextStates(term, (err, states) => {
    if (err) return callback(err)
    if (states && states.length) {
      createSentence(store, termsCollected.concat(states), callback)
    } else {
      callback(null, termsCollected)
    }
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
    createSentence(store, [startTerm], (err, terms) => {
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
  const term = nlp.term(natural.PorterStemmer.stem(thing))

  const store = db(namespace, order)
  const reverseStore = db(`reverse:${namespace}`, order)

  async.auto({
    reverseStartTerm: (cb) => {
      reverseStore.fuzzyMatch(term, cb)
    },
    forwardStartTerm: (cb) => {
      store.fuzzyMatch(term, cb)
    },
    reverseChain: ['reverseStartTerm', (cb, results) => {
      if (!results.reverseStartTerm) return cb(null, [])
      createSentence(reverseStore, [results.reverseStartTerm], cb)
    }],
    forwardChain: ['forwardStartTerm', (cb, results) => {
      if (!results.forwardStartTerm) return cb(null, [])
      createSentence(store, [results.forwardStartTerm], cb)
    }]
  }, (err, results) => {
    if (err) return callback(err)
    const reverseTerms = results.reverseChain.slice().reverse()
    const forwardTerms = results.forwardChain.slice()
    reverseTerms.pop()
    forwardTerms.shift()

    const aboutTerm = results.reverseStartTerm ? results.reverseStartTerm : results.forwardStartTerm

    const terms = reverseTerms.concat(aboutTerm, ...forwardTerms)
    if (terms.length === 1) {
      callback(null, null)
    } else {
      callback(null, assemble(terms))
    }
  })
}
