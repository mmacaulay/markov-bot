# Markov Bot

A Markov Chain bot that wants to get to know you.

## Quickstart™

Prerequisites:

* [Node.js](https://nodejs.org/en/download/) - version 4+
* [npm](https://github.com/npm/npm) - version 3+
* [Redis](http://redis.io/download) - tested against version 2.8, but probably works with older versions

Clone this repo:

`git clone git@github.com:mmacaulay/markov-bot.git`

Install npm packages

`npm install`

Run the tests

`npm test`

## API

Run in dev mode (runs the babel preprocessor and monitors filesystem changes with [nodemon](https://github.com/remy/nodemon)

`npm run dev`

### Seed data

There is a lovely collection of seed data available to play with in the `seeds` directory.

`bin/seed --orders 1,2 --namespaces alice seeds/alice.txt`

For a full list of options, run the `bin/seed` utility without arguments.

### Learn

`POST /learn`

Learn from a corpus of text.

Options:

* `text` (String) [required] - Text to learn from.
* `namespaces` (Array of String) [optional] - List of namespaces to learn, create an additional index on each namespace. The index 'all' is always learned.
* `orders` (Array of Integer) [optional] - List of word orders to learn. The order 1 is always learned.

Request:

```
POST /learn HTTP/1.1
Content-Type: application/json
...
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "namespaces": ["mac"]
  "orders": [2, 3]
}
```
Response:

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
...

ok
```

### Speak

`GET /speak`

Generate some occasionally witty banter. For best results, make at least one prior call to `/learn`.

Options:

* `namespace` (String) [optional] - Generate text based on past things learned as `namespace`.
* `about` (String) [optional] - Generate text containing the `about` word.
* `order` (String) [optional] - Generate text with the specified word order. Default 1.

Request:

```
GET /speak?namespace=alice&about=trees&order=2 HTTP/1.1
```

Response:

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
...

{"data":"There was nothing but the trees behind him."}
```