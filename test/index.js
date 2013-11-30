var relations = process.env.RELATIONS_COV ? require('../lib-cov/relations') : require('../'),
    modella = require('modella'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    cursor = require('level-cursor'),
    leveldown = require('leveldown'),
    level = require('modella-leveldb'),
    assert = require('assert'),
    utils = require('./utils'),
    fs = require('fs')


var User, location = path.join(__dirname, 'db'), users = [
  {name: 'john', id: 1},
  {name: 'hank', id: 2},
  {name: 'sergio', id: 3},
  {name: 'george', id: 4},
  {name: 'fab', id: 5},
  {name: 'edwin', id: 6}
]

beforeEach(function (done) {
  mkdirp(location, done)
})

beforeEach(function () {
  User = modella('User')

  User.use(level(location))
  User.use(relations)
  User.attr('id')
  User.attr('name')
  User.attr('username')
  User.attr('password')
  User.attr('birthdate')
  User.attr('gender')
  User.attr('followers', {is: User})
})

beforeEach(function (done) {
  utils.save_all(User, users, done)
})

afterEach(function (done) {
  User.db.close(function () {
    leveldown.destroy(location, done)
  })
})


describe('get', function () {
  var relations = []

  beforeEach(function (done) {
    utils.generate_random_rels(User, users, 'followers', function (err, rels) {
      if(err) return done(err)
      relations = rels
      done()
    })
  })

  it('get all', function (done) {
    var all = relations.filter(function (rel) {
      return rel.from.id === 1
    })

    cursor(User.relation('followers').get({
      id: 1
    })).all(function (err, users) {
      if(err) return done(err)

      assert(all.length === users.length)
      assert(all.filter(function (rel) {
        return rel.from.id === 1 && users.some(function (user) {
          return user.id === rel.to.id
        })
      }).length === all.length)

      done()
    })
  })

  it('get first', function (done) {
    var all = relations.filter(function (rel) {
      return rel.from.id === 1
    })

    cursor(User.relation('followers').get({
      id: 1
    }, {
      limit: 1
    })).all(function (err, users) {
      if(err) return done(err)

      assert(users.length === 1)
      assert(users[0].id === all[all.length - 1].to.id)

      done()
    })
  })

  it('get from second', function (done) {
    var all = relations.filter(function (rel) {
      return rel.from.id === 1
    })

    cursor(User.relation('followers').get({
      id: 1
    }, {
      limit: 2
    })).all(function (err, user) {
      if(err) return done(err)
      user = user.pop()

      cursor(User.relation('followers').get({
        id: 1
      }, {
        end: user.__relation
      })).all(function (err, users) {
        if(err) return done(err)

        assert(users.length === (all.length - 1))

        done()
      })
    })
  })

  it('get not reversed', function (done) {
    var all = relations.filter(function (rel) {
      return rel.from.id === 1
    })

    cursor(User.relation('followers').get({
      id: 1
    }, {
      reverse: false
    })).all(function (err, users) {
      if(err) return done(err)

      var tos = all.map(function (rel) {
        return rel.to
      })

      assert(all.length === users.length)
      users.forEach(function (user, i) {
        assert(user.id === tos[i].id)
      })

      done()
    })
  })
})


//

// series(users, function (user, fn) {
//   new User(user).save(fn)
// }, function (err, users) {
//   series()
//   User.relation('followers').put()
//   // User.relation('followers').put(john, hank, function (err) {
//
//   //
//   // })
//
//   users
//   console.log(err, )
// })
//
// //
// // var john = User.get(1)
// // var hank = User.get(2)
// //
//
// // User.relation('followers').put({
// //   id: 1
// // }, {
// //   id: 2
// // }, function (err) {
// //   if(err) return done(err)
// //   User.relation('followers').get({
// //     id: 1
// //   })
// //   // cursor().each(function() {
// //   //   console.log(arguments)
// //   // }, function() {
// //   //   console.log(arguments)
// //   // })
// // })