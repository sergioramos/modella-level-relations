var relations = process.env.RELATIONS_COV ? require('../lib-cov/relations') : require('../'),
    modella = require('modella'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    cursor = require('level-cursor'),
    leveldown = require('leveldown'),
    type = require('type-component'),
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
  User.attr('password', {required: true})
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

describe('relation', function () {
  it('should throw when relation called on attrs without options', function () {
    try {
      User.relation('name')
    } catch (err) {
      return assert(err && err.message === 'no relation is defined')
    }

    assert(false)
  })

  it('should throw when relation called on attrs without relation', function () {
    try {
      User.relation('password')
    } catch (err) {
      return assert(err && err.message === 'no relation is defined')
    }

    assert(false)
  })

  it('should throw when relation origin has no PK', function () {
    var Todo = modella('Todo')
    Todo.use(relations)
    Todo.attr('author', {is: User})

    try {
      Todo.relation('author')
    } catch (err) {
      return assert(err && err.message === 'both ends of the relation need to have a Primary Key')
    }

    assert(false)
  })

  it('should throw when relation destiny has no PK', function () {
    var Todo = modella('Todo')
    Todo.use(relations)
    Todo.attr('author', {is: User})

    var Work = modella('Work')
    Work.use(relations)
    Work.attr('id')
    Work.attr('todos', {is: Todo})

    try {
      Work.relation('todos')
    } catch (err) {
      return assert(err && err.message === 'both ends of the relation need to have a Primary Key')
    }

    assert(false)
  })

  it('should return get', function () {
    var relation = User.relation('followers')
    assert(type(relation.get) === 'function')
  })

  it('should return put', function () {
    var relation = User.relation('followers')
    assert(type(relation.put) === 'function')
  })

  it('should return del', function () {
    var relation = User.relation('followers')
    assert(type(relation.del) === 'function')
  })

  it('should return count', function () {
    var relation = User.relation('followers')
    assert(type(relation.count) === 'function')
  })

  it('should return the correct amount of methods', function () {
    var relation = User.relation('followers')
    assert(Object.keys(relation).length === 4)
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

  it('should get all', function (done) {
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

  it('should get first', function (done) {
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

  it('should get from second', function (done) {
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

  it('should get not reversed', function (done) {
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

  it('should throw when no origin is defined', function () {
    try {
      User.relation('followers').get()
    } catch (err) {
      return assert(err && err.message === 'relation origin not defined')
    }

    assert(false)
  })
})

describe('count', function () {
  var relations = []

  beforeEach(function (done) {
    utils.generate_random_rels(User, users, 'followers', function (err, rels) {
      if(err) return done(err)
      relations = rels
      done()
    })
  })

  it('should be accurate', function (done) {
    var expected = relations.filter(function (rel) {
      return rel.from.id === 1
    }).length

    User.relation('followers').count(users[0], function (err, count) {
      if(err) return done(err)

      assert(count === expected)

      done()
    })
  })

  it('should increment', function (done) {
    var prev = relations.filter(function (rel) {
      return rel.from.id === 2
    }).length

    User.relation('followers').put(users[1], {
      name: 'alex',
      id: 7
    }, function (err) {
      if(err) return done(err)

      User.relation('followers').count(users[1], function (err, count) {
        if(err) return done(err)

        assert(count === (prev + 1))

        done()
      })
    })
  })

  it('should decrement', function (done) {
    var all = relations.filter(function (rel) {
      return rel.from.id === 3
    })

    User.relation('followers').del(users[2], all[0].to, function (err) {
      if(err) return done(err)

      User.relation('followers').count(users[2], function (err, count) {
        if(err) return done(err)

        assert(count === (all.length - 1))

        done()
      })
    })
  })
})