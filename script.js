// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
var roomsList=[];
roomsList.push(roomHash);
const roomName = 'observable-' + roomHash;
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};
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
startbutton.addEventListener('click', function(ev){
  takepicture();
  ev.preventDefault();
}, false);
function takepicture() {
  var context = canvas.getContext('2d');
  if (width && height) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(remoteVideo, 0, 0, width, height);
  
    var data = canvas.toDataURL('image/png');
    download(data);
    photo.setAttribute('src', data);
  } else {
    clearphoto();
  }
}
function download(data) {
  var link = document.createElement('a');
  link.download = data;
  link.href = document.getElementById('canvas').toDataURL()
  link.click();
  
  //download.setAttribute("download","archive.png");
  }
function clearphoto() {
  var context = canvas.getContext('2d');
  context.fillStyle = "#AAA";
  context.fillRect(0, 0, canvas.width, canvas.height);

  var data = canvas.toDataURL('image/png');
  photo.setAttribute('src', data);
}
var recordedChunks = [];
function record(){
  var options = {mimeType: 'video/webm;codecs=vp9'};
  mediaRecorder = new MediaRecorder(remoteStream, options);
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  
  function handleDataAvailable(event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    } else {
      // ...
    }
  }
}

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;

const recordButton = document.querySelector('#record');
recordButton.addEventListener('click', () => {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
  }
});


// const downloadButton = document.querySelector('button#download');
function downloadRecordedVideo(){
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

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

function startRecording() {
  recordedBlobs = [];
  let options = {mimeType: 'video/webm;codecs=vp9'};
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.error(`${options.mimeType} is not Supported`);
    // errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
    options = {mimeType: 'video/webm;codecs=vp8'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not Supported`);
      // errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
      options = {mimeType: 'video/webm'};
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not Supported`);
        // errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
        options = {mimeType: ''};
      }
    }
  }

  try {
    mediaRecorder = new MediaRecorder(remoteStream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    // errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  //playButton.disabled = true;
  //downloadButton.disabled = true;
  mediaRecorder.onstop = (event) => {
    downloadRecordedVideo();
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 10ms of data
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
}
function invite(){
  //var borrowerLink=window.location.origin+'/borrower.html#'+roomHash +"";//server url
  var borrowerLink='file:///C:/Users/Gopinath/Downloads/videoChat_webRtc/VideoChat_WebRTC/borrower.html#'+roomHash +"";
  // $(".borrowerLink").val(borrowerLink);
  $(".borrowerLink").val(borrowerLink); 
}



function handleSuccess(stream) {
  recordButton.disabled = false;
  console.log('getUserMedia() got stream:', stream);
  window.stream = stream;

  const gumVideo = document.querySelector('video#gum');
  gumVideo.srcObject = stream;
}

async function init(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
  }
}

document.querySelector('button#start').addEventListener('click', async () => {
  $(".borrowerJoin").hide();
  $(".borrowerVideo-panel").show();
  const hasEchoCancellation = document.querySelector('#echoCancellation').checked;
  const constraints = {
    audio: {
      echoCancellation: {exact: hasEchoCancellation}
    },
    video: {
      width: 1280, height: 720
    }
  };
  console.log('Using media constraints:', constraints);
  await init(constraints);
});
function copy(){
  

  /* Select the text field */
  $(".borrowerLink").select();
  //$(".borrowerLink").setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");
}



