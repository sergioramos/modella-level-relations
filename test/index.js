var modella = require('modella')
var level = require('modella-leveldb')('/tmp/relations')
var relations = require('../')
var cursor = require('level-cursor')
var series = require('map-series')

var User = modella('User')

User.use(level)
User.use(relations)
User.attr('id')
User.attr('name')
User.attr('username')
User.attr('password')
User.attr('birthdate')
User.attr('gender')
User.attr('followers', {is: User})
User.attr('following', {is: User})

var users = [
  {name: 'john', id: 1},
  {name: 'hank', id: 2},
  {name: 'sergio', id: 3},
  {name: 'george', id: 4},
  {name: 'fab', id: 5},
  {name: 'edwin', id: 6}
]

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
// //   if(err) throw err
// //   User.relation('followers').get({
// //     id: 1
// //   })
// //   // cursor().each(function() {
// //   //   console.log(arguments)
// //   // }, function() {
// //   //   console.log(arguments)
// //   // })
// // })