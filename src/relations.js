var path = require('level-path'),
    interpolate = require('util').format,
    timehat = require('timehat'),
    through = require('ordered-through'),
    type = require('type-component'),
    xtend = require('xtend')

var encoding = {
  keyEncoding: 'utf8',
  valueEncoding: 'json'
}

var default_read_opts = xtend(encoding, {
  start: '',
  end: '',
  limit: -1,
  reverse: true
})

//add count
var get_pk = function (value) {
  var pk = value

  if(typeof pk === 'function')
    pk = value()

  return pk
}

var get = function (paths, relation, model, attr) {
  return function (from, opts) {
    if(!from)
      throw new Error('relation origin not defined')

    opts = xtend(default_read_opts, opts)

    var range = paths.from.range({
      attr: attr,
      from: get_pk(from[relation.from]),
      end: opts.end,
      start: opts.start,
      reverse: opts.reverse
    })

    opts.start = range.start
    opts.end = range.end

    return model.db.createValueStream(opts).pipe(through(function (rel, fn) {
      model.get(rel.to, encoding, function (err, to) {
        if(err) return fn(err)
        to.__relation = rel.id;
        fn(null, to)
      })
    }))
  }
}

var put = function (paths, relation, model, attr) {
  return function (from, to, fn) {
    if(!from)
      return fn(new Error('relation origin not found'))
    if(!to)
      return fn(new Error('relation destiny not found'))
    if(!fn || typeof fn !== 'function')
      fn = function () {}

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
      if(err && err.type !== 'NotFoundError')
        return fn(err)
      if(!err)
        count = value

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
      if(err && err.type !== 'NotFoundError')
        return fn(err)
      if(!err)
        return fn(null, value)

      model.db.get(keys.count, encoding, on_count)
    }

    model.db.get(keys.from_to, encoding, on_from_to)
  }
}

var del = function (paths, relation, model, attr) {
  return function (from, to, fn) {
    if(!from)
      return fn(new Error('relation origin not found'))
    if(!to)
      return fn(new Error('relation destiny not found'))
    if(!fn || typeof fn !== 'function')
      fn = function () {}

    from = get_pk(from[relation.from])
    to = get_pk(to[relation.to])
    var keys = {
      from_to: paths.from_to({attr: attr, from: from, to: to})
    }

    // get the count of relations of `from`
    var on_count = function (err, count) {
      if(err && err.type === 'NotFoundError')
        return fn() // no relations found
      if(err && err.type !== 'NotFoundError')
        return fn(err)

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
      if(err && err.type === 'NotFoundError')
        return fn() // no relation found
      if(err && err.type !== 'NotFoundError')
        return fn(err)

      keys.from = paths.from({attr: attr, from: from, id: rel.id})
      keys.count = paths.count({attr: attr, from: from, to: to})

      model.db.get(keys.count, encoding, on_count)
    }

    model.db.get(keys.from_to, encoding, on_from_to)
  }
}

var count = function (paths, relation, model, attr) {
  return function (from, fn) {
    from = get_pk(from[relation.from])

    model.db.get(paths.count({
      attr: attr,
      from: from
    }), encoding, function (err, count) {
      if(err && err.type !== 'NotFoundError')
        return fn(err)
      if(err && err.type === 'NotFoundError')
        return fn(err, 0) // no relation found

      fn(err, count.count)
    })
  }
}

module.exports = function (model) {
  var paths = {
    from: path(interpolate('/relation/from/%s/:attr/:from/:id', model.modelName)),
    count: path(interpolate('/relation/count/%s/:attr/:from', model.modelName)),
    from_to: path(interpolate('/relation/from_to/%s/:attr/:from/:to', model.modelName))
  }

  model.relations = {}

  model.relation = function (attr) {
    var options = model.attrs[attr]

    if(!options || !options.is)
      throw new Error('no relation is defined')

    if(!model.primaryKey || !options.is.primaryKey)
      throw new Error('both ends of the relation need to have a Primary Key')

    var relation = model.relations[attr] = model.relations[attr] = {
      from: model.primaryKey,
      to: options.is.primaryKey
    }

    return {
      get: get(paths, relation, model, attr),
      put: put(paths, relation, model, attr),
      del: del(paths, relation, model, attr),
      count: count(paths, relation, model, attr)
    }
  }
}