var path = require('level-path'),
    interpolate = require('util').format,
    timehat = require('timehat'),
    type = require('type-component'),
    through = require('ordered-through'),
    assertions = require('./assertions'),
    cursor = require('level-cursor'),
    xtend = require('xtend'),
    atomic = require('atomic')()

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

var levels = {}

var count = function (paths, model, attr) {
  return function (from, fn) {
    if(assertions(model, fn)(from)) return
    var rels_db = levels[from.model.modelName].rels_db

    rels_db.get(paths.count({
      attr: attr,
      from: from.primary()
    }), encoding, function (err, count) {
      if(err && err.type !== 'NotFoundError')
        return fn(err)
      if(err && err.type === 'NotFoundError')
        return fn(null, 0) // no relation found

      fn(err, count.count)
    })
  }
}

var get = function (paths, model, attr) {
  var stream = function (from, opts) {
    if(assertions.models(model)(from)) return

    opts = xtend(default_read_opts, opts)
    opts.from = from.primary()
    opts.attr = attr
    opts = paths.from.range(opts)

    var rels_db = levels[from.model.modelName].rels_db

    return rels_db.createValueStream(opts).pipe(through(function (rel, fn) {
      var model_db = levels[rel.modelName].model_db

      model_db.get(rel.to, encoding, function (err, to) {
        if(err) return fn(err)
        var instance = levels[rel.modelName].model(to)
        instance.__relation = rel.id
        fn(null, instance)
      })
    }))
  }

  stream.each = function(from, opts, each, end){
    if(type(opts) !== 'object') {
      end = each
      each = opts
    }

    return cursor(stream(from, opts)).each(each, end)
  }

  stream.all = function(from, opts, fn){
    if(type(opts) !== 'object') {
      fn = opts
    }

    return cursor(stream(from, opts)).all(fn)
  }

  return stream
}

var put = function (paths, model, attr) {
  return function (from, to, fn) {
    if(assertions(model, fn)(from, to)) return

    var rels_db = levels[from.model.modelName].rels_db
    var done, rel = {
      id: timehat(),
      from: from.primary(),
      to: to.primary(),
      modelName: to.model.modelName
    }

    var __fn = fn
    fn = function() {
      done()
      __fn.apply(__fn, arguments)
    }

    var count = {
      count: 0
    }

    var keys = {
      from: paths.from({
        attr: attr,
        from: from.primary(),
        id: rel.id
      }),
      count: paths.count({
        attr: attr,
        from: from.primary()
      }),
      from_to: paths.from_to({
        attr: attr,
        from: from.primary(),
        to: to.primary()
      })
    }

    var on_write = function (err) {
      rel.count = count.count
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
      rels_db.batch()
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
        return fn(new Error('relation already exists'), value)

      rels_db.get(keys.count, encoding, on_count)
    }

    atomic(keys.from_to, function (fn) {
      done = fn
      rels_db.get(keys.from_to, encoding, on_from_to)
    })
  }
}

var del = function (paths, model, attr) {
  return function (from, to, fn) {
    if(assertions(model, fn)(from, to)) return

    var rels_db = levels[from.model.modelName].rels_db
    var done, keys = {
      from_to: paths.from_to({
        attr: attr,
        from: from.primary(),
        to: to.primary()
      })
    }

    var __fn = fn
    fn = function() {
      done()
      __fn.apply(__fn, arguments)
    }

    var return_count = function () {
      count(paths, model, attr)(from, function (err, count) {
        if(err) return fn(err);
        fn(null, {count: count})
      })
    }

    var on_write = function (count) {
      return function (err) {
        fn(err, count)
      }
    }

    // get the count of relations of `from`
    var on_count = function (err, count) {
      if(err && err.type === 'NotFoundError')
        return fn(null, {count: 0})
      if(err && err.type !== 'NotFoundError')
        return fn(err)

      count.count -= 1

      // add the relation
      rels_db.batch()
      .del(keys.from)
      .del(keys.from_to)
      .put(keys.count, count, encoding)
      .write(on_write(count))
    }

    // get the relation
    var on_from_to = function (err, rel) {
      if(err && err.type === 'NotFoundError')
        return return_count()
      if(err && err.type !== 'NotFoundError')
        return fn(err)

      keys.from = paths.from({
        attr: attr,
        from: from.primary(),
        id: rel.id
      })

      keys.count = paths.count({
        attr: attr,
        from: from.primary(),
        to: to.primary()
      })

      rels_db.get(keys.count, encoding, on_count)
    }

    atomic(keys.from_to, function (fn) {
      done = fn
      rels_db.get(keys.from_to, encoding, on_from_to)
    })
  }
}

var relations = function (db, model) {
  if(assertions.db(model, {db: db})) return

  levels[model.modelName] = {
    model: model,
    model_db: model.db,
    rels_db: db
  }

  var paths = {
    from: path(interpolate('/relation/from/%s/:attr/:from/:id', model.modelName)),
    count: path(interpolate('/relation/count/%s/:attr/:from', model.modelName)),
    from_to: path(interpolate('/relation/from_to/%s/:attr/:from/:to', model.modelName))
  }

  model.relation = function (attr) {
    if(assertions.models(model)({model: model})) return

    return {
      get: get(paths, model, attr),
      put: put(paths, model, attr),
      del: del(paths, model, attr),
      count: count(paths, model, attr)
    }
  }
}

module.exports = function (db) {
  return function (model) {
    relations(db, model)
  }
}