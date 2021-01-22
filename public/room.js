const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined)
const peers = {}
const currentUser = {
  username: USERNAME,
  isHost: IS_HOST === "true",
  audio: true,
  video: true,
  id: null,
  mediaStreamId: null
}
let localStream = null;
let streamList = {}

// when peer is ready, send a socket event to join room
myPeer.on('open', id => {

  // set id to current user
  currentUser.id = id

  // get video, audio
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    localStream = stream;
    currentUser.mediaStreamId = localStream.id
    // add our video
    addVideoStream(localStream, currentUser, true)

    // send socket join room event
    socket.emit('join-room', ROOM_ID, currentUser)
  })
})

// when have new user connect to room
socket.on('user-connected', user => {
  //add noty
  new Noty({
    type: 'info',
    text: `${user.username} has joined!`,
    timeout: 3000
  }).show();

  // add user infor to list
  streamList[user.id] = {
    userInfor: user,
    stream: null
  }
  //add new user video
  addVideoStream(null, user)
  //send our info to user
  sendInfoToNewUser(user)
})

function sendInfoToNewUser(newUser) {
  const conn = myPeer.connect(newUser.id)
    conn.on('open', () => {
      conn.send(currentUser)
    })
}

// on received infomation of a user in room
myPeer.on('connection', conn => {
  conn.on('data', user => {

    if (user.id) {
      // add user to stream list
      streamList[user.id] = {
        userInfor: user,
        stream: null
      }

      //call to user
      connectToNewUser(user, localStream)

    }
  })
})

//handle connect to new user
function connectToNewUser(user, stream) {
  // call to new user
  const call = myPeer.call(user.id, stream)

  // create video element

  //when user answered the call, add video
  call.on('stream', userVideoStream => {
    // add user to stream list
    streamList[user.id] = {
      userInfor: user,
      stream: userVideoStream
    }

    addVideoStream(userVideoStream, user)
  })

  // remove video when connect was closed
  call.on('close', () => {
    video.remove()
  })

  //add user to list to handle when they are leave the room
  peers[user.id] = call
}

//when we have a call from other user
myPeer.on('call', call => {
  let incomingUser
  //when we answered the call
  call.on('stream', userVideoStream => {

    // find user that match with mediaStreamId
    const listUser = Object.values(streamList).map(streamList => streamList.userInfor)
    incomingUser = listUser.find(user => user.mediaStreamId === userVideoStream.id)

    //add caller video
    addVideoStream(userVideoStream, incomingUser)
    peers[incomingUser.id] = call
  })

  //answer the call
  call.answer(localStream)
})

// handle media mute, unmute socket event
socket.on('media-status-changed', userData => {

  // set text media button
  const btnVideoMute = document.querySelector(`[id="${userData.id}"] #videoMute`)
  const btnAudioMute = document.querySelector(`[id="${userData.id}"] #audioMute`)
  if (btnVideoMute.classList.contains('btn-primary') !== userData.video) {
    btnVideoMute.classList.toggle('btn-primary')
  }
  if (btnAudioMute.classList.contains('btn-primary') !== userData.audio) {
    btnAudioMute.classList.toggle('btn-primary')
  }

  let streamToMute = null
  // if mute, unmute current user
  if (userData.id === currentUser.id) {
    streamToMute = localStream
    currentUser.audio = userData.audio
    currentUser.video = userData.video
  }

  if (streamToMute) {
    streamToMute.getAudioTracks()[0].enabled = userData.audio
    streamToMute.getVideoTracks()[0].enabled = userData.video
  }
})

// on user disconnect
socket.on('user-disconnected', user => {
  if (peers[user.id]) {
    const col = document.getElementById(user.id)
    col.remove()
    peers[user.id].close()
    new Noty({
      type: 'info',
      text: `${user.username} has left!`,
      timeout: 3000
    }).show();
  }
})



//hande add video
function addVideoStream(stream, user, isCurrentUser) {


  // create a video block
  const col = document.getElementById(user.id) || document.createElement('div')
  col.id = user.id
  col.className = "col-4 d-flex flex-column justify-content-center position-relative mb-3"
  col.innerHTML = `
    <video></video>
    <div style="position: absolute; bottom: 10px; left: 30px;" class="js-name text-white"></div>
    <div style="position: absolute; bottom: 10px; right: 30px;" class="d-flex text-white">
      <button class="mr-3 btn btn-sm" id="videoMute" disabled>Video</button>
      <button class="btn btn-sm" id="audioMute" disabled>Audio</button>
    </div
  `

   //add source to video element and play it
   const video = col.querySelector('video')
   video.srcObject = stream
   video.muted = isCurrentUser
   video.id = "video" + user.id
   video.addEventListener('loadedmetadata', () => {
     video.play()
   })

   //add username to block
   const userName = col.querySelector('.js-name')
   userName.className += (isCurrentUser ? ' font-weight-bold text-info' : '')
   userName.innerText = user.username + `(${user.isHost ? 'Teacher' : 'Student'})`

   //show media status
   const btnVideoMute = col.querySelector('#videoMute')
   const btnAudioMute = col.querySelector('#audioMute')
   if (btnVideoMute.classList.contains('btn-primary') !== user.video) {
    btnVideoMute.classList.toggle('btn-primary')
  }
  if (btnAudioMute.classList.contains('btn-primary') !== user.audio) {
    btnAudioMute.classList.toggle('btn-primary')
  }

   //handle change media status
   // only enable button when this btn is belong to current user or user is host
  if (isCurrentUser || currentUser.isHost) {
    btnVideoMute.disabled = false
    btnAudioMute.disabled = false

    btnVideoMute.addEventListener('click', () => {
      user.video = !(btnVideoMute.classList.contains('btn-primary'))
      // send socket event to every user in the room know that media status has changed
      socket.emit('media-status-change', ROOM_ID, {
        ...user,
        audio: btnAudioMute.classList.contains('btn-primary')
      })
    })

    btnAudioMute.addEventListener('click', () => {
      user.audio = !(btnAudioMute.classList.contains('btn-primary'))
      // send socket event to every user in the room know that media status has changed
      socket.emit('media-status-change', ROOM_ID, {
        ...user,
        video: btnVideoMute.classList.contains('btn-primary')
      })
    })
  } else {
    btnAudioMute.remove()
    btnVideoMute.remove()
  }

  videoGrid.append(col)
}
