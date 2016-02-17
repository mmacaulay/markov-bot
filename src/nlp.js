import nlp from 'nlp_compromise'

export function tokenize (text) {
  return nlp.text(text).sentences
}
