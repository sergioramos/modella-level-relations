var relations = process.env.RELATIONS_COV ? require('../lib-cov/relations') : require('../'),
    modella = require('modella'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    sublevel = require('sublevel'),
    cursor = require('level-cursor'),
    leveldown = require('leveldown'),
    type = require('type-component'),
    store = require('level-modella'),
    level = require('level'),
    timehat = require('timehat'),
    assert = require('assert'),
    utils = require('./utils')

var User, db, sub, users, all_relations, location = path.join(__dirname, 'db')

var create_path = function (done) {
  mkdirp(location, done)
}

var create_model = function (done) {
  db = level(location, done)

  sub = sublevel(db)

  User = modella('User')
  User.use(store(sub.sublevel('users')))
  User.use(relations(sub))
  User.attr('id')
  User.attr('name')
}

var instantiate_models = function (done) {
  utils.save_all(User, [
    {name: 'john', id: timehat()},
    {name: 'hank', id: timehat()},
    {name: 'sergio', id: timehat()},
    {name: 'george', id: timehat()},
    {name: 'fab', id: timehat()},
    {name: 'edwin', id: timehat()}
  ], function (err, values) {
    if(err) return done(err)
    users = values
    done()
  })
}

var close_db = function (done) {
  db.close(function (err) {
    if(err) return done(err)
    leveldown.destroy(location, done)
  })
}

var create_relations = function (done) {
  utils.generate_random_rels(User, users, 'followers', function (err, relations) {
    if(err) return done(err)
    all_relations = relations
    done()
  })
}

describe('relation', function () {

  before(create_path)
  before(create_model)
  before(instantiate_models)
  after(close_db)

  it('should emit error when no db is defined', function (done) {
    var User = modella('User')

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no get method', function (done) {
    var User = modella('User')
    User.db = {
      put: function() {},
      del: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no put method', function (done) {
    var User = modella('User')
    User.db = {
      get: function() {},
      del: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no del method', function (done) {
    var User = modella('User')
    User.db = {
      get: function() {},
      put: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no createValueStream method', function (done) {
    var User = modella('User')
    User.db = {
      get: function() {},
      put: function() {},
      del: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no batch method', function (done) {
    var User = modella('User')
    User.db = {
      get: function() {},
      put: function() {},
      del: function() {},
      createValueStream: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when no db is passed', function (done) {
    var User = modella('User')

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations({}))
  })

  it('should emit error when passed db has no get method', function (done) {
    var User = modella('User')
    var db = {
      put: function() {},
      del: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no put method', function (done) {
    var User = modella('User')
    var db = {
      get: function() {},
      del: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no del method', function (done) {
    var User = modella('User')
    var db = {
      get: function() {},
      put: function() {},
      createValueStream: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no createValueStream method', function (done) {
    var User = modella('User')
    var db = {
      get: function() {},
      put: function() {},
      del: function() {},
      batch: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })

  it('should emit error when db has no batch method', function (done) {
    var User = modella('User')
    var db = {
      get: function() {},
      put: function() {},
      del: function() {},
      createValueStream: function() {}
    }

    User.once('error', function (err) {
      assert(err && err.message === 'expected levelup based db');
      done()
    })

    User.use(relations(db))
  })


  it('should emit error when relation called from model without PK', function (done) {
    var Todo = modella('Todo')
    Todo.use(store(db))
    Todo.use(relations(db))
    Todo.attr('author')

    Todo.once('error', function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })

    Todo.relation('author')
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
    assert(Object.keys(relation).length === 5)
  })
})

describe('get', function () {

  before(create_path)
  before(create_model)
  before(instantiate_models)
  before(create_relations)
  after(close_db)

  it('should get all', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    cursor(User.relation('followers').get(users[0])).all(function (err, followers) {
      if(err) return done(err)
      assert(relations.length === followers.length)
      assert(relations.filter(function (relation) {
        return relation.from.primary() === users[0].primary() && followers.some(function (follower) {
          return follower.primary() === relation.to.primary()
        })
      }).length === followers.length)
      done()
    })
  })

  it('should get first', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    cursor(User.relation('followers').get(users[0], {
      limit: 1
    })).all(function (err, followers) {
      if(err) return done(err)
      assert(followers.length === 1)
      assert(followers[0].primary() === relations[relations.length - 1].to.primary())
      done()
    })
  })

  it('should get from second', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    cursor(User.relation('followers').get(users[0], {
      limit: 2
    })).all(function (err, followers) {
      if(err) return done(err)
      follower = followers.pop()

      cursor(User.relation('followers').get(users[0], {
        end: follower.__relation
      })).all(function (err, followers) {
        if(err) return done(err)
        assert(followers.length === (relations.length - 1))
        done()
      })
    })
  })

  it('should get not reversed', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    cursor(User.relation('followers').get(users[0], {
      reverse: false
    })).all(function (err, followers) {
      if(err) return done(err)

      var tos = relations.map(function (rel) {
        return rel.to
      })

      assert(relations.length === followers.length)
      followers.forEach(function (follower, i) {
        assert(follower.primary() === tos[i].primary())
      })

      done()
    })
  })

  it('each record should have a relation id', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    cursor(User.relation('followers').get(users[0], {
      limit: 1
    })).all(function (err, followers) {
      if(err) return done(err)
      var now = new Date()
      follower = followers.shift()
      assert(type(follower.__relation) === 'string')
      assert(follower.__relation.length > 0)
      assert(timehat.toDate(follower.__relation).getUTCMonth() === now.getUTCMonth())
      assert(timehat.toDate(follower.__relation).getUTCDate() === now.getUTCDate())
      assert(timehat.toDate(follower.__relation).getUTCHours() === now.getUTCHours())
      assert(timehat.toDate(follower.__relation).getYear() === now.getYear())
      done()
    })
  })

  it('should emit error when argument is not a model', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'model expected');
      done()
    })

    User.relation('followers').get({
      model: {
        modelName: ''
      }
    })
  })

  it('should emit error when the model has no PK', function (done) {
    var Todo = modella('Todo')

    User.once('error', function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })

    User.relation('todos').get(Todo({}))
  })

  it('should emit error when the model instance has it\'s PK not defined', function (done) {
    var Todo = modella('Todo')
    Todo.attr('id')

    User.once('error', function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })

    User.relation('todos').get(Todo({}))
  })

  it('should call each', function (done) {
    var found = [], relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    User.relation('followers').get.each(users[0], function(user){
      found.push(user)
    }, function (err) {
      if(err) return done(err)
      assert(found.length === relations.length)
      done()
    })
  })

  it('should call all', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    })

    User.relation('followers').get.all(users[0], function (err, users) {
      if(err) return done(err)
      assert(users.length === relations.length)
      done()
    })
  })
})

describe('has', function () {

  before(create_path)
  before(create_model)
  after(close_db)

  var a, b

  before(function (done) {
    a = User({id: timehat()})
    b = User({id: timehat()})

    User.relation('following').put(a, b, done)
  })

  it('it should cb true when the relation exists', function(done){
    User.relation('following').has(a, b, function (err, has) {
      if(err) return done(err)
      assert(has)
      done()
    });
  });

  it('it should cb false when the relation doesn\'t exist', function(done){
    User.relation('following').has(a, User({id: timehat()}), function (err, has) {
      if(err) return done(err)
      assert(!has)
      done()
    })
  })
})

describe('count', function () {

  before(create_path)
  before(create_model)
  before(instantiate_models)
  before(create_relations)
  after(close_db)

  it('should emit error when callback is not passed', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'expected callback');
      done()
    })

    User.relation('followers').count()
  })


  it('should cb error when argument is not a model', function (done) {
    User.relation('followers').count({
      model: {
        modelName: ''
      }
    }, function (err) {
      assert(err && err.message === 'model expected');
      done()
    })
  })

  it('should emit error when the model has no PK', function (done) {
    var Todo = modella('Todo')

    User.relation('todos').count(Todo({}), function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })
  })

  it('should emit error when the model instance has it\'s PK not defined', function (done) {
    var Todo = modella('Todo')
    Todo.attr('id')

    User.relation('todos').count(Todo({}), function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })
  })

  it('should be accurate', function (done) {
    var expected = all_relations.filter(function (rel) {
      return rel.from.primary() === users[0].primary()
    }).length

    User.relation('followers').count(users[0], function (err, count) {
      if(err) return done(err)
      assert(count === expected)
      done()
    })
  })

  it('should increment', function (done) {
    var prev = all_relations.filter(function (rel) {
      return rel.from.primary() === users[1].primary()
    }).length

    User.relation('followers').put(users[1], User({
      name: 'alex',
      id: timehat()
    }), function (err) {
      if(err) return done(err)

      User.relation('followers').count(users[1], function (err, count) {
        if(err) return done(err)
        assert(count === (prev + 1))
        done()
      })
    })
  })

  it('should decrement', function (done) {
    var relations = all_relations.filter(function (rel) {
      return rel.from.primary() === users[2].primary()
    })

    User.relation('followers').del(users[2], relations[0].to, function (err) {
      if(err) return done(err)

      User.relation('followers').count(users[2], function (err, count) {
        if(err) return done(err)
        assert(count === (relations.length - 1))
        done()
      })
    })
  })

  it('should return 0 when no relations are found', function (done) {
    User.relation('followers').count(User({
      id: timehat()
    }), function (err, count) {
      if(err) return done(err)
      assert(count === 0)
      done()
    })
  })
})

describe('put', function () {

  before(create_path)
  before(create_model)
  before(instantiate_models)
  before(create_relations)
  after(close_db)

  it('should emit error when callback is not passed', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'expected callback');
      done()
    })

    User.relation('followers').put()
  })

  it('should emit error when args.length < 3', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'expected callback');
      done()
    })

    User.relation('followers').put(null, null)
  })

  it('should cb error when origin is not model', function (done) {
    User.relation('followers').put(null, null, function (err) {
      assert(err && err.message === 'model expected');
      done()
    })
  })

  it('should cb error when destiny is not model', function (done) {
    User.relation('followers').put(User({
      id: timehat()
    }), null, function (err) {
      assert(err && err.message === 'model expected');
      done()
    })
  })

  it('should cb error when origin model doesn\'t have a primary key', function (done) {
    var Todo = modella('Todo')

    User.relation('followers').put(Todo({
      name: 'elias'
    }), null, function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })
  })

  it('should cb error when destiny model doesn\'t have a primary key', function (done) {
    var Todo = modella('Todo')

    User.relation('followers').put(User({
      id: timehat()
    }), Todo({
      name: 'elias'
    }), function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })
  })

  it('should cb error when origin model instance doesn\'t have a primary key defined', function (done) {
    User.relation('followers').put(User({
      name: 'bryan'
    }), null, function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })
  })

  it('should cb error when destiny model instance doesn\'t have a primary key defined', function (done) {
    User.relation('followers').put(User({
      id: timehat()
    }), User({
      name: 'roger'
    }), function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })
  })

  it('should callback with relation', function (done) {
    var a = User({
      id: timehat(),
      name: 'roger'
    })

    var b = User({
      id: timehat(),
      name: 'stan'
    })

    User.relation('followers').put(a, b, function (err, relation) {
      if(err) return done(err)

      var now = new Date()

      assert(relation.to === b.primary())
      assert(relation.from === a.primary())
      assert(type(relation.id) === 'string')
      assert(relation.count === 1)
      assert(relation.id.length > 0)
      assert(timehat.toDate(relation.id).getUTCMonth() === now.getUTCMonth())
      assert(timehat.toDate(relation.id).getUTCDate() === now.getUTCDate())
      assert(timehat.toDate(relation.id).getUTCHours() === now.getUTCHours())
      assert(timehat.toDate(relation.id).getYear() === now.getYear())

      done()
    })
  })

  it('should callback err when relation already exixts', function (done) {
    var a = User({
      id: timehat(),
      name: 'tywin'
    })

    var b = User({
      id: timehat(),
      name: 'tyrion'
    })

    User.relation('followers').put(a, b, function (err, relation) {
      if(err) return done(err)

      User.relation('followers').put(a, b, function (err) {
        assert(err && err.message === 'relation already exists')
        done()
      })
    })
  })

  it('should put anatomically', function (done) {
    var a = User({
      id: timehat(),
      name: 'daenerys'
    })

    var b = User({
      id: timehat(),
      name: 'jorah'
    })

    User.relation('followers').put(a, b, function (err, relation) {
      if(err) return done(err)
    })

    User.relation('followers').put(a, b, function (err) {
      assert(err && err.message === 'relation already exists')
      done()
    })
  })
})

describe('del', function () {

  before(create_path)
  before(create_model)
  before(instantiate_models)
  before(create_relations)
  after(close_db)

  it('should emit error when callback is not passed', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'expected callback');
      done()
    })

    User.relation('followers').del()
  })

  it('should emit error when args.length < 3', function (done) {
    User.once('error', function (err) {
      assert(err && err.message === 'expected callback');
      done()
    })

    User.relation('followers').del(null, null)
  })

  it('should cb error when origin is not model', function (done) {
    User.relation('followers').put(null, null, function (err) {
      assert(err && err.message === 'model expected');
      done()
    })
  })

  it('should cb error when destiny is not model', function (done) {
    User.relation('followers').del(User({
      id: timehat()
    }), null, function (err) {
      assert(err && err.message === 'model expected');
      done()
    })
  })

  it('should cb error when origin model doesn\'t have a primary key', function (done) {
    var Todo = modella('Todo')

    User.relation('followers').del(Todo({
      name: 'elias'
    }), null, function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })
  })

  it('should cb error when destiny model doesn\'t have a primary key', function (done) {
    var Todo = modella('Todo')

    User.relation('followers').del(User({
      id: timehat()
    }), Todo({
      name: 'elias'
    }), function (err) {
      assert(err && err.message === 'expected model with a primary key');
      done()
    })
  })

  it('should cb error when origin model instance doesn\'t have a primary key defined', function (done) {
    User.relation('followers').del(User({
      name: 'bryan'
    }), null, function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })
  })

  it('should cb error when destiny model instance doesn\'t have a primary key defined', function (done) {
    User.relation('followers').del(User({
      id: timehat()
    }), User({
      name: 'roger'
    }), function (err) {
      assert(err && err.message === 'expected model with primary key value defined');
      done()
    })
  })

  it('should work with inexistent relations', function (done) {
    var a = User({
      id: timehat(),
      name: 'abernathy'
    })

    var b = User({
      id: timehat(),
      name: 'arlene'
    })

    User.relation('followers').del(a, b, done)
  })

  it('should callback with 0 count when no relations exist', function (done) {
    var a = User({
      id: timehat(),
      name: 'charlie'
    })

    var b = User({
      id: timehat(),
      name: 'dennis'
    })


    User.relation('followers').del(a, b, function (err, relation) {
      if(err) return done(err)
      assert(relation.count === 0)
      done()
    })
  })

  it('should callback with count', function (done) {
    var a = User({
      id: timehat(),
      name: 'mac'
    })

    var b = User({
      id: timehat(),
      name: 'frank'
    })

    User.relation('followers').put(a, b, function (err, relation) {
      if(err) return done(err)
      assert(relation.count === 1)

      User.relation('followers').del(a, b, function (err, relation) {
        if(err) return done(err)
        assert(relation.count === 0)
        done()
      })
    })
  })

  it('should del atomically', function (done) {
    var a = User({
      id: timehat(),
      name: 'hodor'
    })

    var b = User({
      id: timehat(),
      name: 'bran'
    })

    User.relation('followers').put(a, b, function (err, relation) {
      if(err) return done(err)
      assert(relation.count === 1)
      var called = false

      User.relation('followers').del(a, b, function (err, relation) {
        if(err) return done(err)
        called = true
        assert(relation.count === 0)
      })

      User.relation('followers').del(a, b, function (err, relation) {
        if(err) return done(err)
        assert(relation.count === 0)
        assert(called)
        done()
      })
    })
  })
})