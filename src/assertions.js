var type = require('type-component')

var db_props = ['get', 'put', 'del', 'createValueStream', 'batch'];

var assert = module.exports = function (model, fn) {
  return function () {
    if(assert.fn(model, fn))
      return true

    return assert.models(model, fn).apply(this, arguments)
  }
}

var dispatch = function(emitter, fn, err) {
  if(type(fn) !== 'function')
    return emitter.emit('error', err)

  fn(err)
  return true
}

assert.fn = function (model, fn) {
  if(type(fn) === 'function')
    return

  return model.emit('error', new Error('expected callback'))
}

assert.models = function (emitter, fn) {
  return function () {
    return Array.prototype.some.call(arguments, function (instance) {
      if(!(instance && instance.model && instance.model.modelName))
        return dispatch(emitter, fn, new Error('model expected'))
      if(!instance.model.primaryKey)
        return dispatch(emitter, fn, new Error('expected model with a primary key'))
      if(instance.isNew && instance.isNew())
        return dispatch(emitter, fn, new Error('expected model with primary key value defined'))
    })
  }
}

assert.db = function () {
  return Array.prototype.some.call(arguments, function (model) {
    if(model.db && db_props.every(function (prop) {
      return type(model.db[prop]) === 'function'
    })) return

    return model.emit('error', new Error('expected levelup based db'))
  })
}