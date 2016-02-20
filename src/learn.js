import async from 'async'
import _ from 'lodash'
import { tokenize } from './nlp'
import db from './db'

function learnTerms (terms, order, callback) {
  const store = db(order)
  const filteredTerms = terms.filter((term) => {
    // Filter out terms that don't have a text component.
    // These arise when there is a contraction; the NLP library
    // creates an implicit term with an empty text field.
    return !!term.text
  })
  return filteredTerms.map((term, index) => {
    const currentState = term
    const nextIndex = index + 1

    const nextStates = filteredTerms.slice(nextIndex, nextIndex + order)
    return async.apply(store.storeState, currentState, nextStates, { isStartTerm: index === 0 })
  })
}

function learnSentence (sentence, order, callback) {
  const fns = learnTerms(sentence.terms, order, callback)
  async.series(fns, callback)
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

  const sentences = tokenize(text)
  async.parallel(_.flatten(sentences.map((sentence) => {
    return orders.map((order) => {
      return async.apply(learnSentence, sentence, order)
    })
  })), callback)
}
