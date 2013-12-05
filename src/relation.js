var path = require('level-path'),
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

var decorate_atomic = function (done, fn) {
  return function () {
    done()
    fn.apply(fn, arguments)
  }
}


var relation = module.exports = function (model, attr, db, paths) {
  if(!(this instanceof relation)) return new relation(model, attr, db, paths)

  this.db = db
  this.model = model
  this.attr = attr
  this.paths = {
    from: path('/relation/from/' + model.modelName + '/:attr/:from/:id'),
    from_to: path('/relation/from_to/' + model.modelName + '/:attr/:from/:to'),
    count: path('/relation/count/' + model.modelName + '/:attr/:from')
  }
}

relation.prototype.count = function (from, fn) {
  if(assertions(this.model, fn)(from)) return

  this.db.get(this.paths.count({
    attr: this.attr,
    from: from.primary()
  }), encoding, function (err, count) {
    if(err && err.type !== 'NotFoundError') return fn(err)
    if(err && err.type === 'NotFoundError') return fn(null, 0) // no relation found

    fn(err, count.count)
  })
}

relation.prototype.has =  function (from, to, fn) {
  if(assertions(this.model, fn)(from, to)) return

  this.db.get(this.paths.from_to({
    attr: this.attr,
    from: from.primary(),
    to: to.primary()
  }), encoding, function(err){
    if(err && err.type !== 'NotFoundError') return fn(err)
    fn(null, !err)
  })
}

relation.prototype.get = function (from, opts) {
  if(assertions.models(this.model)(from)) return

  opts = xtend(default_read_opts, opts)
  opts.from = from.primary()
  opts.attr = this.attr
  opts = this.paths.from.range(opts)

  return this.db.createValueStream(opts).pipe(through(function (rel, fn) {
    relation.models[rel.modelName].db.get(rel.to, encoding, function (err, to) {
      if(err) return fn(err)
      var instance = relation.models[rel.modelName](to)
      instance.__relation = rel.id
      fn(null, instance)
    })
  }))
}

relation.prototype.each = function (from, opts, each, end) {
  if(type(opts) !== 'object') {
    end = each
    each = opts
  }

  if(assertions.fns(this.model)(each, end)) return

  return cursor(this.get(from, opts)).each(each, end)
}

relation.prototype.all = function (from, opts, fn) {
  if(type(opts) !== 'object') fn = opts
  if(assertions.fn(this.model, fn)) return

  return cursor(this.get(from, opts)).all(fn)
}

relation.prototype.put = function (from, to, fn) {
  if(assertions(this.model, fn)(from, to)) return
  var self = this

  var rel = {
    id: timehat(),
    from: from.primary(),
    to: to.primary(),
    modelName: to.model.modelName
  }

  var count = {
    count: 0
  }

  var keys = {
    from: self.paths.from({
      attr: self.attr,
      from: from.primary(),
      id: rel.id
    }),
    count: self.paths.count({
      attr: self.attr,
      from: from.primary()
    }),
    from_to: self.paths.from_to({
      attr: self.attr,
      from: from.primary(),
      to: to.primary()
    })
  }

  function on_write (err) {
    rel.count = count.count
    fn(err, rel)
  }

  // get the count of relations of `from`
  function on_count (err, value) {
    if(err && err.type !== 'NotFoundError') return fn(err)
    if(!err) count = value

    count.count += 1

    // add the relation
    self.db.batch()
    .put(keys.from, rel, encoding)
    .put(keys.from_to, rel, encoding)
    .put(keys.count, count, encoding)
    .write(on_write)
  }

  // check if already exists the relation
  function on_from_to (err, value) {
    if(err && err.type !== 'NotFoundError') return fn(err)
    if(!err) return fn(new Error('relation already exists'), value)

    self.db.get(keys.count, encoding, on_count)
  }

  atomic(keys.from_to, function (done) {
    fn = decorate_atomic(done, fn)
    self.db.get(keys.from_to, encoding, on_from_to)
  })
}

relation.prototype.del = function (from, to, fn) {
  if(assertions(this.model, fn)(from, to)) return
  var self = this

  var count, keys = {
    from_to: self.paths.from_to({
      attr: self.attr,
      from: from.primary(),
      to: to.primary()
    })
  }

  function return_count () {
    self.count(from, function (err, count) {
      if(err) return fn(err)
      fn(null, {count: count})
    })
  }

  function on_write (err) {
    fn(err, count)
  }

  // get the count of relations of `from`
  function on_count (err, value) {
    if(err && err.type === 'NotFoundError') return fn(null, {count: 0})
    if(err && err.type !== 'NotFoundError') return fn(err)

    count = value
    count.count -= 1

    // add the relation
    self.db.batch()
    .del(keys.from)
    .del(keys.from_to)
    .put(keys.count, count, encoding)
    .write(on_write)
  }

  // get the relation
  function on_from_to (err, rel) {
    if(err && err.type === 'NotFoundError') return return_count()
    if(err && err.type !== 'NotFoundError') return fn(err)

    keys.from = self.paths.from({
      attr: self.attr,
      from: from.primary(),
      id: rel.id
    })

    keys.count = self.paths.count({
      attr: self.attr,
      from: from.primary(),
      to: to.primary()
    })

    self.db.get(keys.count, encoding, on_count)
  }

  atomic(keys.from_to, function (done) {
    fn = decorate_atomic(done, fn)
    self.db.get(keys.from_to, encoding, on_from_to)
  })
}

relation.prototype.toggle = function (from, to, fn) {
  if(assertions(this.model, fn)(from, to)) return
  var self = this

  self.has(from, to, function (err, has) {
    if(err) return fn(err)
    if(has) self.del(from, to, fn);
    else self.put(from, to, fn);
  })
}

relation.models = Object.create(null)