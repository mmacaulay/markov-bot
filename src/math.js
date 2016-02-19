import _ from 'lodash'

function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function calculateCumulativeSum (data) {
  const grouped = _.groupBy(data, (n) => {
    return n.score
  })
  const scores = _.keys(grouped).map((key) => {
    return parseInt(key, 10)
  }).sort()

  return scores.reduce((collected, score, index) => {
    const previousScore = scores[index - 1] || 0
    const cumulativeScore = score + previousScore
    collected[cumulativeScore.toString()] = grouped[score.toString()]
    return collected
  }, {})
}

function findClosest (scores, weight) {
  for (let i = 0; i < scores.length; i++) {
    const current = scores[i]
    const next = scores[i + 1]
    if (!next) return current
    if (weight < current) return current
    if (weight >= current && weight <= next) {
      const split = (next - current) / 2
      return weight < (current + split) ? current : next
    }
  }
}

export function weightedRandom (data) {
  if (data.length === 0) return null
  if (data.length === 1) return data[0]

  const cumulativeSum = calculateCumulativeSum(data)

  const scores = _.keys(cumulativeSum).map((key) => {
    return parseInt(key, 10)
  }).sort()
  const minWeight = _.first(scores)
  const maxWeight = _.last(scores)
  const randomWeight = randomInt(minWeight, maxWeight)
  const closestScore = findClosest(scores, randomWeight)
  const closest = cumulativeSum[closestScore]
  const index = closest.length > 1 ? randomInt(0, closest.length - 1) : 0

  return closest[index]
}
