const ws = new WebSocket("ws://localhost:3000");
ws.onopen = () => {
  console.log("socket open");
};
ws.onmessage = (message) => {
  console.log(message);
};
ws.onerror = () => {
  console.log("socket error");
};
ws.onclosen = () => {
  console.log("socket close");
};
const app = document.querySelector("#app");
const video = document.createElement("video");
video.autoplay = true;
app.appendChild(video);
let localStream = null;
let pc = new RTCPeerConnection({
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
});

pc.onicecandidate = function (e) {
  console.log("onicecandidate", e);
  if (e.candidate) {
    socket.send({
      type: "candidate",
      candidate: e.candidate,
    });
  }
};

pc.ontrack = function (e) {
  console.log("ontrack", e);
  remoteVideo.current.srcObject = remoteStream = e.streams[0];
};

pc.ondatachannel = function (e) {
  dataChannel = e.channel;
  console.log(localStream.getVideoTracks());
  handleData();
  sendData({
    peerMediaStream: {
      video: localStream.getVideoTracks()[0].enabled,
    },
  });
};

let others = [];

function makeVideo() {
  const vd = document.createElement("video");
  vd.autoplay = true;
  app.appendChild(vd);
}
// function createVideo() {
//   new RTCPeerConnection({

// 	});
// }

window.addEventListener("load", () => {
  window.navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      console.log(stream);
      window.stream = stream;
      video.srcObject = stream;

      makeConnection(stream);
    })
    .catch((e) => {
      console.log("getUserMedia error", e);
    });
});

function makeConnection(/** @type {MediaStream} */ stream) {
  stream.getTracks().forEAch((track) => pc.addTrack(track, stream));
}

function handleIc(data) {
  console.log("ice cadidate");
  console.log(data);
}
