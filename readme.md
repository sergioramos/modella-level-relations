# modella-level-relations

[![NPM version](https://badge.fury.io/js/modella-level-relations.png)](http://badge.fury.io/js/modella-level-relations)
[![Build Status](https://secure.travis-ci.org/ramitos/modella-level-relations.png)](http://travis-ci.org/ramitos/modella-level-relations)
[![Dependency Status](https://gemnasium.com/ramitos/modella-level-relations.png)](https://gemnasium.com/ramitos/modella-level-relations)
[![Coverage Status](https://coveralls.io/repos/ramitos/modella-level-relations/badge.png?branch=master)](https://coveralls.io/r/ramitos/modella-level-relations?branch=master)
[![Code Climate](https://codeclimate.com/github/ramitos/modella-level-relations.png)](https://codeclimate.com/github/ramitos/modella-level-relations)

## install

```bash
npm install [--save/--save-dev] modella-level-relations
```

## example

```js
var modella = require('modella'),
    level = require('modella-leveldb')('/path/to/my/db'),
    relations = require('modella-level-relations'),
    series = require('map-series')

var User = modella('User')

User.use(level)
User.use(relations)
User.attr('id')
User.attr('name')
User.attr('username')
User.attr('password')
User.attr('birthdate')
User.attr('gender')
User.attr('followers', {is: User})


series([
  {name: 'ryan', id: 1},
  {name: 'seth', id: 2}
], function (user, fn) {
  User(user).save(fn)
}, function (err, users) {
  if(err) throw err

  User.relation('followers').put(users[0], users[1], function (err, relation) {
    if(err) throw err

    console.log(relation) //=> {id: '142ab9de503-e195d2afc8677f8aa975abfee8f6a935', from: 1, to: 2}

    User.relation('followers').get(users[0]).on('data', function (user) {
      console.log(user) //=> {name: 'seth', id: 2, __relation: '142ab9de503-e195d2afc8677f8aa975abfee8f6a935'}
    })
  })
})
```

## api

### use

On every Model that needs relations, Model.use should be called:

```js
var relations = require('modella-level-relations')
var level = require('modella-leveldb')('/path/to/my/db')

var User = modella('User')
User.use(level)
User.use(relations)
```

**Important**: `modella-level-relations` requires levelup as the `modella` backend.

### is

On every relation that has a relation needs to pass `is` to it's `attr`options:

```js
var relations = require('modella-level-relations')

var User = modella('User')
User.use(level)
User.use(relations)
User.attr('id')

var Todo = modella('Todo')
Todo.use(relations)
Todo.attr('id')
Todo.attr('author', {is: User})
```

**Important**: `modella-level-relations` requires both ends of the relation to have a primary key

### put(from, to, callback)

```js
User.relation('followers').put({
  id: 1
}, {
  id: 2
}, function (err, relation) {})
```

### get(from[, options])

```js
var cursor = require('level-cursor')

cursor(User.relation('followers').get({id: 1})).each(function (follower) {}, function (err) {})
```

#### `options`

 * `start`: the relation id key you wish to start the read at.
 * `end`: the relation id key you wish to end the read at.
 * `reverse` (boolean, default: true): by default, the relations are fetched in reverse order: the last added relation is the first to be fetched
 * `limit` (number, default: -1): limit the number of results

### del(from, to, callback)

```js
User.relation('followers').del({id: 1}, {id: 2}, function (err) {})
```

### count(from, callback)

```js
User.relation('followers').count({id: 1}, function (err, count) {})
```

## license

MIT