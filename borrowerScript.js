
let room;
let pc;
var localStream;
var remoteStream;
var startbutton=document.getElementById("takePhoto");
var photo = document.getElementById('photo');
var canvas = document.getElementById('canvas');
var width=320;
var height=320;
function onSuccess() {};
function onError(error) {
  console.log(error);
};
const configuration = {
    iceServers: [{
      urls: 'stun:stun.l.google.com:19302'
    }]
  };
  var drone;
  var roomName;
function openDrone(){
     drone = new ScaleDrone('yiS12Ts5RdNhebyM');
    // Generate random room name if needed
if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }
  const roomHash = location.hash.substring(1);
  
  // TODO: Replace with your own channel ID
  
  // Room name needs to be prefixed with 'observable-'
  var roomsList=[];
  roomsList.push(roomHash);
  roomName = 'observable-' + roomHash;
  
    drone.on('open', error => {
        if (error) {
          return console.error(error);
        }
        room = drone.subscribe(roomName);
        console.log(room);
        room.on('open', error => {
          if (error) {
            onError(error);
          }
        });
        // We're connected to the room and received an array of 'members'
        // connected to the room (including us). Signaling server is ready.
        room.on('members', members => {
          console.log('MEMBERS', members);
          // If we are the second user to connect to the room we will be creating the offer
          const isOfferer = members.length === 2;
          startWebRTC(isOfferer);
        });
      });
}


// Send signaling data via Scaledrone
function sendMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {
  pc = new RTCPeerConnection(configuration);
  
  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
  }

  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
    const stream = event.streams[0];
    //myStream=stream;
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
      remoteStream=stream;
    }
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    // Display your local video in #localVideo element
    localVideo.srcObject = stream;
    localStream=stream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);

  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }
  });
  
}
function mute(){
  //connection.streams.mute();
  var c=localStream.getTracks();
  
  //pc.mediaDevices.remoteVideo.track.muted=!pc.mediaDevices.remoteVideo.track.muted;
  localStream.getTracks().forEach(track => track.muted = !track.muted);
  console.log(c);
  
}

var hangUpBtn=document.getElementById("hangUpBtn");
hangUpBtn.addEventListener("click", function () { 
  handleLeave(); 
  
  document.getElementById("remoteVideo").style.display="none";
  document.getElementById("meetingEnd").style.display="inline-flex";
  //window.document.body.load();
  
});
function toggleMute(){
  //toggleBtn($("#mic-btn")); // toggle button colors
  localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled);
  //myStream.getTracks().forEach(track => track.muted = !track.muted);
  //$("#mic-icon").toggleClass('fa-microphone').toggleClass('fa-microphone-slash'); // toggle the mic icon
  if ($("#muteIcon").hasClass('fa-microphone')) {
    $("#muteIcon").removeClass('fa-microphone');
    $("#muteIcon").addClass('fa-microphone-slash');
    //myStream.getTracks().forEach(track => track.muted = !track.muted);// enable the local mic
    //toggleVisibility("#mute-overlay", false); // hide the muted mic icon
  } else {
    $("#muteIcon").addClass('fa-microphone');
    $("#muteIcon").removeClass('fa-microphone-slash');
    //myStream.getTracks().forEach(track => track.muted = !track.muted); // mute the local mic
    
   // toggleVisibility("#mute-overlay", true); // show the muted mic icon
  }
}
function handleLeave() { 
  

  pc.ontrack = null;
  pc.onremovetrack = null;
  pc.onremovestream = null;
  pc.onicecandidate = null;
  pc.oniceconnectionstatechange = null;
  pc.onsignalingstatechange = null;
  pc.onicegatheringstatechange = null;
  pc.onnegotiationneeded = null;

  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
  }

  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
  }

  pc.close();
  pc = null;


remoteVideo.removeAttribute("src");
remoteVideo.removeAttribute("srcObject");
localVideo.removeAttribute("src");
remoteVideo.removeAttribute("srcObject");



};

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}
function toggleVideoStreaming(){
  if(localVideo.srcObject==localStream){
    remoteVideo.srcObject=localStream;
    localVideo.srcObject=remoteStream;
  }else{
    remoteVideo.srcObject=remoteStream;
    localVideo.srcObject=localStream;
  }
  // remoteVideo.srcObject=localVideo.srcObject;
}

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;


function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}




function handleSuccess(stream) {
  //recordButton.disabled = false;
  console.log('getUserMedia() got stream:', stream);
  window.stream = stream;

//   const gumVideo = document.querySelector('video#gum');
//   gumVideo.srcObject = stream;
}


function join(){
    $(".borrowerJoin").hide();
    $(".main-section").show();
    openDrone();
}



