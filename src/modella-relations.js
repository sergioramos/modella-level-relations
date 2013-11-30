var path = require('level-path'),
    interpolate = require('util').format,
    timehat = require('timehat'),
    through = require('through')

var encoding = {
  keyEncoding: 'utf8',
  valueEncoding: 'json'
}

//add count
var get_pk = function (value) {
  var pk = value

  if(typeof pk === 'function')
    pk = value()

  return pk
}

var get = function (paths, relation, model, attr) {
  return function (from) {
    if(!relation) return new Error('relation not found')
    if(!from) return new Error('relation origin not found')

    var stream = model.db.createValueStream({
      keyEncoding: 'utf8',
      valueEncoding: 'json',
      start: paths.from({attr: attr, from: get_pk(from[relation.from])})
    })

    return stream.pipe(through(function (data) {
      var self = this;

      model.get(data.to, encoding, function (err, to) {
        if(err) return self.emit('error', err)
        this.emit('data', to)
      })
    }))
  }
}

var put = function (paths, relation, model, attr) {
  return function (from, to, fn) {
    if(!relation) return fn(new Error('relation not found'))
    if(!from) return fn(new Error('relation origin not found'))
    if(!to) return fn(new Error('relation destiny not found'))
    if(!fn || typeof fn !== 'function') fn = function() {}

    from = get_pk(from[relation.from])
    to = get_pk(to[relation.to])

    var count = {count: 0}
    var rel = {
      id: timehat(),
      from: from,
      to: to
    }

    var keys = {
      from: paths.from({attr: attr, from: from, id: rel.id}),
      count: paths.count({attr: attr, from: from}),
      from_to: paths.from_to({attr: attr, from: from, to: to})
    }

    var on_write = function (err) {
      fn(err, rel)
    }

    // get the count of relations of `from`
    var on_count = function (err, value) {
      if(err && err.type !== 'NotFoundError') return fn(err)
      if(!err) count = value

      count.count += 1

      // add the relation
      model.db.batch()
      .put(keys.from, rel, encoding)
      .put(keys.from_to, rel, encoding)
      .put(keys.count, count, encoding)
      .write(on_write)
    }

    // check if already exists the relation
    var on_from_to = function (err, value) {
      if(err && err.type !== 'NotFoundError') return fn(err)
      if(!err) return fn(null, value)

      model.db.get(keys.count, encoding, on_count)
    }

    model.db.get(keys.from_to, encoding, on_from_to)
  }
}

var del = function (paths, relation, model, attr) {
  return function (from, to, fn) {
    if(!relation) return fn(new Error('relation not found'))
    if(!from) return fn(new Error('relation origin not found'))
    if(!to) return fn(new Error('relation destiny not found'))
    if(!fn || typeof fn !== 'function') fn = function() {}

    from = get_pk(from[relation.from])
    to = get_pk(to[relation.to])
    var keys = {}

    // get the count of relations of `from`
    var on_count = function (err, count) {
      if(err && err.type === 'NotFoundError') return fn() // no relations found
      if(err && err.type !== 'NotFoundError') return fn(err)

      count.count -= 1

      // add the relation
      model.db.batch()
      .del(keys.from)
      .del(keys.from_to)
      .put(keys.count, count, encoding)
      .write(fn)
    }

    // get the relation
    var on_from_to = function (err, rel) {
      if(err && err.type === 'NotFoundError') return fn() // no relation found
      if(err && err.type !== 'NotFoundError') return fn(err)

      keys = {
        from: paths.from({attr: attr, from: from, id: rel.id}),
        count: paths.count({attr: attr, from: from}),
        from_to: paths.from_to({attr: attr, from: from, to: to})
      }

      model.db.get(keys.count, encoding, on_count)
    }

    model.db.get(keys.from_to, encoding, on_from_to)
  }
}

var count = function(paths, relation, model, attr) {
  return function(from, fn) {
    from = get_pk(from[relation.from])

    model.db.get(paths.count({
      attr: attr,
      from: from
    }), encoding, function(err, count) {
      if(err && err.type !== 'NotFoundError') return fn(err)
      if(err && err.type === 'NotFoundError') return fn(err, 0) // no relation found
      fn(err, count.count)
    })
  }
}

module.exports = function (model) {
  var paths = {
    from: path(interpolate('/relation/%s/:attr/:from', model.modelName)),
    count: path(interpolate('/count/%s/:attr/:from', model.modelName)),
    from_to: path(interpolate('/relation/%s/:attr/:from/:to', model.modelName))
  }

  model.relations = {}

  model.on('attr', function (attr, options) {
    if(!options || !options.is) return
    if(!model.primaryKey || !options.is.primaryKey)
      throw new Error('both ends of the relation need to have a Primary Key')

    model.relations[attr] = {
      from: model.primaryKey,
      to: options.is.primaryKey
    }
  })

  model.relation = function(name) {
    var relation = model.relations[name]

    return {
      get: get(paths, relation, model, name),
      put: put(paths, relation, model, name),
      del: del(paths, relation, model, name),
      count: count(paths, relation, model, name)
    }
  }
}