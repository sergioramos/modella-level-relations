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

  objs.forEach(function (from) {
    exports.array(Math.floor(objs.length - 2)).forEach(function () {
      var to = {
        primary: function() {
          return from.primary()
        }
      }

      while(to.primary() === from.primary()) {
        to = objs[Math.floor(Math.random() * objs.length)]
      }

      if(rels.some(function (rel) {
        return rel.from.primary() === from.primary() && rel.to.primary() === to.primary()
      })) return

      rels.push({
        from: from,
        to: to
      })
    })
  })

  series(rels, function (rel, fn) {
    model.relation(attr).put(rel.from, rel.to, fn)
  }, function (err) {
    fn(err, rels)
  })
}