import mocha from 'mocha'
import { assert } from 'chai'
import { tokenize } from '../../src/nlp'

const describe = mocha.describe
const it = mocha.it

describe('nlp', () => {
  describe('tokenize', () => {
    it('splits text into sentences and terms', () => {
      const sentences = tokenize('The quick brown fox')
      assert.equal(sentences.length, 1)

      var terms = sentences[0].terms
      assert.equal(terms.length, 3)
      assert.equal(terms[0].text, 'The')
      assert.equal(terms[1].text, 'quick brown')
      assert.equal(terms[2].text, 'fox')
    })
  })
})
