var assertions = require('./assertions'),
    relation = require('./relation')

/**
 * dual relation constructor
 *
 * ```javascript
 * relations('following', 'followers')
 * ```
 *
 * @param {string} from_attr
 * @param {string} to_attr
 * @returns {relations}
 * @api public
 */
var relations = module.exports = function (from_attr, to_attr) {
  if(!(this instanceof relations)) return new relations(from_attr, to_attr)

  this.from_attr = from_attr
  this.to_attr = to_attr
}

/**
 * modella plugin
 *
 * ```javascript
 * User.use(relations.plugin(levelup_instance))
 * ```
 *
 * @param {object} db
 * @returns {function}
 * @api public
 */
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

/**
 * put a dual relation
 *
 * ```javascript
 * relations('following', 'followers').put(user_a, user_b, function (err, relations) {
 *   assert(relations.following.from === user_a.primary())
 *   assert(relations.following.to === user_b.primary())
 *   assert(relations.followers.from === user_b.primary())
 *   assert(relations.followers.to === user_a.primary())
 * })
 * ```
 *
 * @param {model} from
 * @param {model} to
 * @api public
 */
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
    relations.to = relation
    relations.to.attr = self.to_attr
    fn(null, relations)
  }

  function on_from (err, relation) {
    if(err) return fn(err)
    relations.from = relation
    relations.from.attr = self.from_attr

    to.model.relation(self.to_attr).put(to, from, on_to)
  }

  from.model.relation(self.from_attr).put(from, to, on_from)
}

/**
 * del a dual relation
 *
 * ```javascript
 * relations('following', 'followers').del(user_a, user_b, function (err) {})
 * ```
 *
 * @param {model} from
 * @param {model} to
 * @api public
 */
relations.prototype.del = function (from, to, fn) {
  var relations = Object.create(null)
  var self = this

  function revert (err) {
    from.model.relation(self.from_attr).put(from, to, function (rev_err) {
      fn(rev_err ? rev_err : err)
    })
  }

  function on_to (err, relation) {
    if(err) return revert(err)
    relations.to = relation
    relations.to.attr = self.from_attr
    fn(null, relations)
  }

  function on_from (err, relation) {
    if(err) return fn(err)
    relations.from = relation
    relations.from.attr = self.from_attr
    to.model.relation(self.to_attr).del(to, from, on_to)
  }

  from.model.relation(self.from_attr).del(from, to, on_from)
}

/**
 * check if a dual relation exists
 *
 * ```javascript
 * relations('following', 'followers').has(user_a, user_b, function (err, has) {})
 * ```
 *
 * @param {model} from
 * @param {model} to
 * @api public
 */
relations.prototype.has = function (from, to, fn) {
  var from_has, to_has
  var self = this

  function on_to_has (err, has) {
    if(err) return fn(err);
    to_has = has

    if(from_has !== to_has) return fn(new Error('inconsistent dual relation'))
    fn(null, from_has)
  }

  function on_from_has (err, has) {
    if(err) return fn(err);
    from_has = has

    to.model.relation(self.to_attr).has(to, from, on_to_has)
  }

  from.model.relation(self.from_attr).has(from, to, on_from_has)
}

/**
 * toggle a dual relation
 *
 * ```javascript
 * relations('following', 'followers').toggle(user_a, user_b, function (err) {})
 * ```
 *
 * @param {model} from
 * @param {model} to
 * @api public
 */
relations.prototype.toggle = function (from, to, fn) {
  var self = this

  self.has(from, to, function (err, has) {
    if(err) return fn(err)
    if(has) self.del(from, to, fn)
    else self.put(from, to, fn)
  })
}