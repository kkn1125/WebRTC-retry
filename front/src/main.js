// const app = document.querySelector("#app");
// const video = document.createElement("video");
// video.autoplay = true;
// app.appendChild(video);

import { RTCPeer } from "./model/RTCPeer";
import { Socket } from "./model/Socket";

/** @type {RTCDataChannel} */
let dataChannel = null;
let localVideo = document.createElement("video");
app.appendChild(localVideo);
localVideo.autoplay = true;
localVideo.controls = true;
let localStream = null;
const videos = new Map();

const PC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const peers = new Map();
const pendingCandidates = {};
let mysid = null;

// const socket = new Socket();

const socket = new WebSocket("ws://localhost:3000");
socket.onopen = () => {
  console.log("socket open");
};
socket.onmessage = async (message) => {
  const json = JSON.parse(message.data);
  const sid = json.sid;
  delete json.sid;
  if (json.type === "ready") {
    await getUserMedia();
    console.log("receive ready from socket server");
    mysid = sid;
    peers.set(sid, createPeerConnection());
    localVideo.srcObject = localStream;
    // ontrack에 의해 감지
    localStream.getTracks().forEach((track) => {
      /** @type {RTCPeerConnection} */ (peers.get(sid)).addTrack(
        track,
        localStream
      );
    });
    dataChannel = /** @type {RTCPeerConnection} */ (
      peers.get(sid)
    ).createDataChannel("chat");
    // console.log(dataChannel);
    dataChannel.onopen = (e) => {
      console.log("datachannel open!");
    };
    dataChannel.onmessage = (e) => {
      console.log("onmessage", e);
    };
    dataChannel.onerror = (e) => {
      console.log("onerror", e);
    };
    dataChannel.onclose = (e) => {
      console.log("onclose", e);
    };
    /** @type {RTCPeerConnection} */ (peers.get(sid))
      .createOffer()
      .then((offer) => setLocalDescription(sid, offer))
      .then(() => sendLocalDescription(sid))
      .then(() => {})
      .catch((err) => {
        console.log("answer error", err);
      });
  } else if (json.type === "offer") {
    console.log("receive offer from socket server");
    peers.get(sid).setRemoteDescription(new RTCSessionDescription(json));
    /** @type {RTCPeerConnection} */ (peers.get(sid))
      .createAnswer()
      .then((answer) => setLocalDescription(sid, answer))
      .then(() => sendLocalDescription(sid))
      .then(() => {})
      .catch((err) => {
        console.log("answer error", err);
      });
    addPendingCandidates(sid);
  } else if (json.type === "answer") {
    console.log("receive answer from socket server");
    try {
      const state = peers.get(sid).signalingState;
      console.log(state, json);
      peers
        .get(sid)
        .setRemoteDescription(new RTCSessionDescription(json))
        .catch((e) => console.log(e));
    } catch (e) {
      console.log(e);
    }
  } else if (json.type === "candidate") {
    console.log("receive candidate from socket server");
    peers.get(sid).addIceCandidate(json.candidate);
  }
};
socket.onerror = (err) => {
  console.log("socket error", err);
};
socket.onclose = () => {
  console.log("socket close");
};

// rtc
function getUserMedia(sid) {
  return navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      localStream = stream;
    });
}
// rtc
function createPeerConnection() {
  const pc = new RTCPeerConnection(PC_CONFIG);
  pc.onicecandidate = onIcecandidate;
  pc.ondatachannel = onDatachannel;
  pc.ontrack = onTrack;
  pc.onconnectionstatechange = (e) => {
    console.log("peer connection change", e);
  };
  return pc;
}

// rtc
function setLocalDescription(sid, session) {
  return /** @type {RTCPeerConnection} */ (peers.get(sid)).setLocalDescription(
    new RTCSessionDescription(session)
  );
}
//socket rtc
function sendLocalDescription(sid) {
  const session = /** @type {RTCPeerConnection} */ (peers.get(sid))
    .localDescription;
  sendData({
    sid: sid,
    type: session.type,
    sdp: session.sdp,
  });
}
// socket
function onIcecandidate(e) {
  // console.log('onicecandidate')
  if (e.candidate) {
    socket.send(
      JSON.stringify({
        sid: mysid,
        type: "candidate",
        candidate: e.candidate,
      })
    );
  }
}
// rtc
function onDatachannel(e) {
  console.log("ondatachannel!");
  dataChannel = e.channel;
  // console.log(localStream.getVideoTracks());
  dataChannel.send(
    JSON.stringify({
      peerMediaStream: {
        video: localStream.getVideoTracks()[0].enabled,
      },
    })
  );
}
// rtc
function onTrack(e) {
  console.log("on track!!", e);
  if (e.track.kind === "video") {
    let remoteVideo = document.createElement("video");
    remoteVideo.controls = true;
    remoteVideo.autoplay = true;
    app.appendChild(remoteVideo);
    // streams가 비어있을 경우 초기 getUserMedia에서 addTrack시 2번째 인자로 localStream을 주어야 한다.
    remoteVideo.srcObject = e.streams[0];
    console.log("pc received remote stream");
  }
}

// socket
function sendData(data) {
  socket.send(JSON.stringify(data));
}

function addPendingCandidates(sid) {
  if (sid in pendingCandidates) {
    pendingCandidates[sid].forEach((candidate) => {
      peers.get(sid).addIceCandidate(new RTCIceCandidate(candidate));
    });
  }
}
