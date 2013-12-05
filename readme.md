# modella-level-relations

[![NPM version](https://badge.fury.io/js/modella-level-relations.png)](http://badge.fury.io/js/modella-level-relations)
[![Build Status](https://secure.travis-ci.org/ramitos/modella-level-relations.png)](http://travis-ci.org/ramitos/modella-level-relations)
[![Dependency Status](https://gemnasium.com/ramitos/modella-level-relations.png)](https://gemnasium.com/ramitos/modella-level-relations)
[![Coverage Status](https://coveralls.io/repos/ramitos/modella-level-relations/badge.png?branch=master)](https://coveralls.io/r/ramitos/modella-level-relations?branch=master)

## install

```bash
npm install [--save/--save-dev] modella-level-relations
```

## example

```js
var relations = require('modella-level-relations'),
    modella = require('modella'),
    sublevel = require('sublevel'),
    store = require('level-modella'),
    level = require('level'),
    timehat = require('timehat')
    assert = require('assert'),
    series = require('map-series')

var db = level('/tmp/relations')
var sub = sublevel(db)
var User = modella('User')

User.use(store(sub.sublevel('users')))
User.use(relations.plugin(sub.sublevel('relations')))
User.attr('id')
User.attr('name')

var frank = User({
  id: timehat(),
  name: 'frank'
})

var charlie = User({
  id: timehat(),
  name: 'charlie'
})

series([frank, charlie], function (user, fn) {
  user.save(fn)
}, function (err) {
  if(err) throw err

  User.relation('followers').put(frank, charlie, function (err, relation) {
    if(err) throw err

    var now = new Date()
    assert(relation.from === frank.primary())
    assert(relation.to === charlie.primary())
    assert(typeof relation.id === 'string')
    assert(relation.id.length > 0)
    assert(timehat.toDate(relation.id).getUTCMonth() === now.getUTCMonth())
    assert(timehat.toDate(relation.id).getUTCDate() === now.getUTCDate())
    assert(timehat.toDate(relation.id).getUTCHours() === now.getUTCHours())
    assert(timehat.toDate(relation.id).getYear() === now.getYear())


    User.relation('followers').get(frank).on('data', function (follower) {
      assert(follower.name() === charlie.name())
      assert(follower.primary() === charlie.primary())
      assert(follower.__relation === relation.id)
    })
  })
})
```

## api

### use

On every Model that needs relations, Model.use should be called:

```js
var relations = require('modella-level-relations')
var store = require('level-modella')
var level = require('level')('/path/to/my/db')

var User = modella('User')
User.use(store(level))
User.use(relations.plugin(level))
```

**Important**: `modella-level-relations` requires level as the `modella` backend.

### put(from, to, callback)

```js
User.relation('followers').put(model_instance_a, model_instance_b, function (err, relation) {})
```

### has(from, to, callback)

```js
User.relation('followers').has(model_instance_a, model_instance_b, function (err, has) {})
```

### get(from[, options])

```js
var cursor = require('level-cursor')

cursor(User.relation('followers').get(model_instance_a)).each(function (follower) {}, function (err) {})
```

### each(from[, options], each, end)

```js
User.relation('followers').each(model_instance_a, function (follower) {}, function (err) {})
```

### all(from[, options], each, end)

```js
User.relation('followers').all(model_instance_a, function (err, followers) {})
```


#### `options`

 * `start`: the relation id key you wish to start the read at.
 * `end`: the relation id key you wish to end the read at.
 * `reverse` (boolean, default: true): by default, the relations are fetched in reverse order: the last added relation is the first to be fetched
 * `limit` (number, default: -1): limit the number of results

### del(from, to, callback)

```js
User.relation('followers').del(model_instance_a, model_instance_b, function (err) {})
```

### count(from, callback)

```js
User.relation('followers').count(model_instance_a, function (err, count) {})
```

### toggle(from, to, callback)

```js
User.relation('followers').toggle(model_instance_a, function (err) {})
```


### relations.put(from, to, callback)

```js
var relations = require('modella-level-relations')

// `a` -> following -> `b`
// `b` -> followers -> `a`
relations('following', 'followers').put(a, b, function (err, relations) {})
```

### relations.del(from, to, callback)

```js
var relations = require('modella-level-relations')

// `a` -> !following -> `b`
// `b` -> !followers -> `a`
relations('following', 'followers').del(a, b, function (err, relations) {})
```

### relations.has(from, to, callback)

```js
var relations = require('modella-level-relations')

// (`a` -> following -> `b`) && (`b` -> followers -> `a`)
relations('following', 'followers').has(a, b, function (err, has) {})
```

### relations.toggle(from, to, callback)

```js
var relations = require('modella-level-relations')

// `a` -> !following -> `b`
// `b` -> !followers -> `a`
relations('following', 'followers').toggle(a, b, function (err, relations) {})
```

## license

MIT