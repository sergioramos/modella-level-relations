var series = require('map-series'),
    type = require('type-component')

exports.array = function (length, n) {
  if(type(n) !== 'number') n = 0
  return Array.apply(null, Array(length)).map(Number.prototype.valueOf, n)
}

exports.save_all = function (model, objs, fn) {
  series(objs, function (obj, fn) {
    model(obj).save(fn)
  }, fn)
}

exports.generate_random_rels = function (model, objs, attr, fn) {
  var rels = []

  series(exports.array(objs.length - 1, 0), function (i, fn) {
    objs.forEach(function (user, i) {
      var random = i

      while(random === i) {
        random = Math.floor(Math.random() * objs.length)
      }

      if(rels.some(function (rel) {
        return rel.from.id === user.id && rel.to.id === objs[random].id
      })) return

      rels.push({
        from: user,
        to: objs[random]
      })
    })

    series(rels, function (rel, fn) {
      model.relation(attr).put(rel.from, rel.to, fn)
    }, fn)
  }, function (err) {
    fn(err, rels)
  })
}