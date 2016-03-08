import async from 'async'
import _ from 'lodash'
import { tokenize } from './nlp'
import db from './db'

function learnTerms (terms, order, namespace, callback) {
  const store = db(namespace, order)
  const filteredTerms = terms.filter((term) => {
    // Filter out terms that don't have a text component.
    // These arise when there is a contraction; the NLP library
    // creates an implicit term with an empty text field.
    return !!term.text
  })
  async.series(filteredTerms.map((term, index) => {
    const currentState = term
    const nextIndex = index + 1

    const nextStates = filteredTerms.slice(nextIndex, nextIndex + order)
    return async.apply(store.storeState, currentState, nextStates, { isStartTerm: index === 0 })
  }), callback)
}

function learnSentence (sentence, orders, namespaces, callback) {
  const fns = _.flatten(orders.map((order) => {
    return namespaces.map((namespace) => {
      return async.apply(learnTerms, sentence.terms, order, namespace)
    })
  }))
  async.parallel(fns, callback)
}

export default function learn (text, opts, callback) {
  if (arguments.length === 2) {
    callback = opts
    opts = {
      orders: [1]
    }
  }
  const orders = opts.orders || [1]
  if (orders.indexOf(1) === -1) {
    orders.unshift(1)
  }

  const namespaces = ['all'].concat(opts.namespaces ? opts.namespaces : [])

  const sentences = tokenize(text)
  async.parallel(sentences.map((sentence) => {
    return async.apply(learnSentence, sentence, orders, namespaces)
  }), callback)
}
