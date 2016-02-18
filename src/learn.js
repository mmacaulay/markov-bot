import async from 'async'
import { tokenize } from './nlp'
import db from './db'

function learnTerms (terms, callback) {
  const store = db()
  return terms.map((term, index) => {
    const currentState = term
    const nextState = terms[index + 1]
    return async.apply(store.storeState, currentState, nextState, { isStartTerm: index === 0 })
  })
}

function learnSentence (sentence, callback) {
  var fns = learnTerms(sentence.terms, callback)
  async.series(fns, callback)
}

export default function learn (text, callback) {
  const sentences = tokenize(text)
  async.parallel(sentences.map((sentence) => {
    return async.apply(learnSentence, sentence)
  }), callback)
}
