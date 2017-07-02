// server.js

// Import all our dependencies
var express = require('express')
var mongoose = require('mongoose')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)

app.use(express.static(__dirname + '/public'))
mongoose.connect('mongodb://localhost/scotch-chat')

// create schema for chat
var ChatSchema = mongoose.Schema({
  created: Date,
  content: String,
  username: String,
  room: String
})

var Chat = mongoose.model('Chat', ChatSchema)

// allow CORS(Cross Origin Resource Sharing)
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Access-Token,X-Key')
  if (req.method === 'OPTIONS') {
    req.status(200).end()
  } else {
    next()
  }
})

/* ||||||||||||| ROUTES |||||||||||||| */
app.get('/', function (req, res) {
  res.sendfile('index.html')
})

// This route is simply run only to generate some chat history
app.post('/setup', function (req, res) {
  // Array of chat data
  var chatData = [{
    created: new Date(),
    content: 'Hi',
    username: 'Chris',
    room: 'php'
  }, {
    created: new Date(),
    content: 'Hello',
    username: 'Obinna',
    room: 'laravel'
  }, {
    created: new Date(),
    content: 'Ait',
    username: 'Bill',
    room: 'angular'
  }, {
    created: new Date(),
    content: 'Amazing room',
    username: 'Patience',
    room: 'socet.io'
  }]
  // Loop through each of the chat data and insert into the database
  for (var c = 0; c < chatData.length; c++) {
    // Create an instance of the chat model
    var newChat = new Chat(chatData[c])
    // Call save to insert the chat
    newChat.save(function (err, savedChat) {
      if (err) {
        throw err
      }
      console.log(savedChat)
    })
  }
  // Send a resoponse so the serve would not get stuck
  res.send('created')
})

// This route produces a list of chat as filtered by 'room' query
app.get('/msg', function (req, res) {
  // Find
  Chat.find({
    'room': req.query.room.toLowerCase()
  }).exec(function (err, msgs) {
    if (err) {
      throw err
    }
    // Send
    res.json(msgs)
  })
})
/* ||||||||||||| END ROUTES |||||||||||||| */

/* ||||||||||||| SOCKETS |||||||||||||| */
// Listen for connections
io.on('connection', function (socket) {
  // Global
  var defaultRoom = 'general'
  var rooms = ['General', 'angular', 'socket.io', 'express', 'node', 'mongo', 'PHP', 'laravel']

  // Emit rooms array
  socket.emit('setup', {
    rooms: rooms
  })

  // Listen from new user
  socket.on('new user', function (data) {
    data.room = defaultRoom
    // New user joins the default rooms
    socket.join(defaultRoom)
    // Tell all those in the room that a new user has joined
    io.in(defaultRoom).emit('user joined', data)
  })

  // Listen for switch rooms
  socket.on('switch room', function (data) {
    // Handles joining and leaving room
    socket.leave(data.oldRoom)
    socket.join(data.newRoom)
    io.in(data.oldRoom).emit('user left', data)
    io.in(data.newRoom).emit('user joined', data)
  })

  // Listen for a new chat
  socket.on('new message', function (data) {
    // Create message
    var newMsg = new Chat({
      username: data.username,
      content: data.message,
      room: data.room.toLowerCase(),
      created: new Date()
    })
    // Save it to the database
    newMsg.save(function (err, msg) {
      if (err) {
        throw err
      }
      // Send message to those connected in the room
      io.in(msg.room).emit('message created', msg)
    })
  })
})
/* ||||||||||||| END SOCKETS |||||||||||||| */

server.listen(2015)
console.log('Its going down in 2015')
