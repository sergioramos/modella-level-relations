var assertions = require('./assertions'),
    relation = require('./relation')

var relations = module.exports = function (from_attr, to_attr) {
  if(!(this instanceof relations)) return new relations(from_attr, to_attr)

  this.from_attr = from_attr
  this.to_attr = to_attr
}

relations.plugin = function (db) {
  return function (Model) {
    if(assertions.db(Model, {db: db})) return

    relation.models[Model.modelName] = Model

    Model.relation = function (attr) {
      if(assertions.models(Model)({model: Model})) return
      return relation(Model, attr, db)
    }
  }
}

relations.prototype.put = function (from, to, fn) {
  var relations = Object.create(null)
  var self = this

  function revert (err) {
    from.model.relation(self.from_attr).del(from, to, function (rev_err) {
      fn(rev_err ? rev_err : err)
    })
  }

  function on_to (err, relation) {
    if(err) return revert(err)
    relations[self.to_attr] = relation
    fn(null, relations)
  }

  function on_from (err, relation) {
    if(err) return fn(err)
    relations[self.from_attr] = relation

    to.model.relation(self.to_attr).put(to, from, on_to)
  }

  from.model.relation(self.from_attr).put(from, to, on_from)
}

relations.prototype.del = function (from, to, fn) {
  var self = this

  function revert (err) {
    from.model.relation(self.from_attr).put(from, to, function (rev_err) {
      fn(rev_err ? rev_err : err)
    })
  }

  function on_to (err, relation) {
    if(err) return revert(err)
    fn(null)
  }

  function on_from (err, relation) {
    if(err) return fn(err)
    to.model.relation(self.to_attr).del(to, from, on_to)
  }

  from.model.relation(self.from_attr).del(from, to, on_from)
}

relations.prototype.has = function (from, to, fn) {
  var from_has, to_has
  var self = this

  function on_to_has (err, has) {
    if(err) return fn(err);
    to_has = has

    if(from_has !== to_has) return fn(new Error('inconsistent bi-directionality'))
    fn(null, from_has)
  }

  function on_from_has (err, has) {
    if(err) return fn(err);
    from_has = has

    to.model.relation(self.to_attr).has(to, from, on_to_has)
  }

  from.model.relation(self.from_attr).has(from, to, on_from_has)
}

relations.prototype.toggle = function (from, to, fn) {
  var self = this

  self.has(from, to, function (err, has) {
    if(err) return fn(err)
    if(has) self.del(from, to, fn)
    else self.put(from, to, fn)
  })
}