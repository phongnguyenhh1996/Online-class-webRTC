const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const bodyParser = require('body-parser')
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const roomUsers = {}
const isHaveHostRooms = {}

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  return res.render('home')
})

// post user data
app.post('/', (req, res) => {
  const user = req.body
  // if not enough data -> redirect to home
  if (user.userName && user.className && user.role) {
    return res.cookie('user', user, {maxAge: 10800}).redirect('/'+  user.className);
  } else return res.redirect('/')
})

app.get('/:room', (req, res) => {
  const user = req.cookies.user
  const room = req.params.room

  if (!user) {
    return res.redirect('/')
  }

  if (user.role === 'host') {
    if (!isHaveHostRooms[user.className]) {
      isHaveHostRooms[user.className] = true
    } else {
      return res.redirect('/')
    }
  }

  if (roomUsers[room]) {
    roomUsers[room].push(user)
  } else {
    roomUsers[room] = [user]
  }

  return res.clearCookie().render('room', { roomId: room, userName: user.userName, isHost: user.role === 'host'})
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, user) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', user)
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', user)
    })
  })
  socket.on('media-status-change', (roomId, user) => {
    io.to(roomId).emit('media-status-changed', user)
  })
})

server.listen(3000)
