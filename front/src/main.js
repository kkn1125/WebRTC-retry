import { User } from "./model/User";

const PC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const host = import.meta.env.VITE_HOST;
const port = Number(import.meta.env.VITE_API_PORT) || 3000;
/** @type {Map<number, User>} */
const peers = new Map();
const pendingCandidates = {};
let sid = null;
let rooms = [];
let roomIdx = 0;

const socket = new WebSocket(`ws://${host}:${port}`);

socket.binaryType = "arraybuffer";

socket.onopen = function () {
  console.log("socket open");
};
socket.onmessage = async function ({ data }) {
  const json = JSON.parse(data);
  switch (json.type) {
    case "ready":
      // console.log(json);
      sid = json.sid;
      rooms = json.rooms;
      renderList(rooms);
      break;
    case "create:room":
      rooms = json.rooms;
      renderList(json.rooms);
      break;
    case "join:room":
      rooms = json.rooms;
      roomIdx = json.roomId;
      // console.log(rooms, roomIdx, rooms[roomIdx]);
      document.querySelector("#userList").innerHTML = `
      ${rooms[roomIdx].userList
        .map((user) => {
          if (!peers.has(user)) createPeerConnection(user);
          return `<li data-user-id="${user}">${user}</li>`;
        })
        .join("")}
        `;
      createPeerConnection(json.sid);
      peers.get(json.sid).setRoomId(roomIdx);

      break;
    case "offer":
      console.log("get offer", peers, json);
      // createPeerConnection(json.sid);

      await setRemoteDescription(json.sid, json.type, json.sdp);
      peers
        .get(json.sid)
        .createAnswer()
        .then((session) => peers.get(json.sid).setLocalDescription(session))
        .then(() => sendAnswer(json.sid));
      // createAnswer();
      break;
    case "answer":
      console.log("get answer", peers, json);
      // createPeerConnection(json.sid);
      await setRemoteDescription(json.sid, json.type, json.sdp);
      // peers.forEach((value) => {
      //   if (value.roomId === roomIdx) {
      //   }
      // });
      break;
  }
};
socket.onerror = function () {
  console.log("socket error");
};
socket.onclose = function () {
  console.log("socket close");
};

/* ceate room */
window.addEventListener("click", (e) => {
  const target = e.target;
  if (target.id !== "create") return;
  socket.send(
    JSON.stringify({
      type: "create:room",
      options: {
        type: "onetomany",
        title: "test",
        limit: 50,
        options: {
          video: true,
          audio: true,
          chat: true,
        },
      },
    })
  );
});

/* join */
window.addEventListener("click", (e) => {
  const target = e.target;

  if (!target.hasAttribute("data-room-id")) return;

  const roomId = target.getAttribute("data-room-id");
  socket.send(
    JSON.stringify({
      type: "join:room",
      roomId: Number(roomId),
      sid: sid,
    })
  );
  videoRoom();
});

/* call (start my video) */
window.addEventListener("click", async (e) => {
  const target = e.target;

  if (target.id !== "call") return;
  await getUserMedia();
  // socket.send(
  //   JSON.stringify({
  //     type: "call",
  //     roomId: Number(roomIdx),
  //     sid: sid,
  //   })
  // );
});

/* hangup (start my video) */
window.addEventListener("click", async (e) => {
  const target = e.target;

  if (target.id !== "hangup") return;
  peers
    .get(sid)
    .createOffer()
    .then((session) => peers.get(sid).setLocalDescription(session))
    .then(() => sendOffer());

  // socket.send(
  //   JSON.stringify({
  //     type: "call",
  //     roomId: Number(roomIdx),
  //     sid: sid,
  //   })
  // );
});

/* room out */
window.addEventListener("click", (e) => {
  const target = e.target;

  if (target.id !== "out") return;

  init();
  renderList();
});

/* rtc */
function createPeerConnection(sid) {
  const pc = new User(sid, PC_CONFIG);
  pc.onicecandidate = onIceCandidate;
  pc.onicecandidateerror = onIceCandidateError;
  pc.ontrack = onTrack;
  // pc.onsignalingstatechange = onSignalingStateChange;
  pc.ondatachannel = onDataChannel;
  peers.set(sid, pc);
}
function onIceCandidate(e) {
  console.log("icecandidate");
  console.log(e);
  peers.get(sid).addIceCandidate(e.icecandidate);
}
function onIceCandidateError(e) {
  console.log("icecandidate error");
  console.log(e);
}
function onTrack(e) {
  console.log("on track");
  if (e.track.kind === "video") {
    let remoteVideo = document.createElement("video");
    remoteVideo.controls = true;
    remoteVideo.autoplay = true;
    document.querySelector("#videos").append(remoteVideo);
    // streams가 비어있을 경우 초기 getUserMedia에서 addTrack시 2번째 인자로 localStream을 주어야 한다.
    remoteVideo.srcObject = e.streams[0];
    console.log("pc received remote stream");
  }
}
function onSignalingStateChange(e) {
  console.log("signaling");
  // console.log(e);
}
function onDataChannel(e) {
  console.log("datachannel");
  console.log(e);
}
async function getUserMedia() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      peers.get(sid).stream = stream;
      peers.get(sid).video = document.createElement("video");
      peers.get(sid).video.srcObject = stream;
      peers.get(sid).video.autoplay = true;
      document.querySelector("#videos").append(peers.get(sid).video);

      stream.getTracks().forEach((track) => {
        /** @type {RTCPeerConnection} */ (peers.get(sid)).addTrack(
          track,
          stream
        );
      });
    });
}
function setRemoteDescription(sid, type, sdp) {
  return peers
    .get(sid)
    .setRemoteDescription(new RTCSessionDescription({ type, sdp }));
}

function sendOffer() {
  const session = peers.get(sid).localDescription;
  socket.send(
    JSON.stringify({
      roomId: roomIdx,
      sid: sid,
      type: session.type,
      sdp: session.sdp,
    })
  );
}
function sendAnswer(sid) {
  const session = peers.get(sid).localDescription;
  socket.send(
    JSON.stringify({
      roomId: roomIdx,
      sid: sid,
      type: session.type,
      sdp: session.sdp,
    })
  );
}

/* ui */
function init() {
  document.querySelector("#app").innerHTML = `
    <div>
      <ol id="list"></ol>
      <button id="create">create</button>
      <button id="join">join</button>
    </div>
  `;
}

function renderList() {
  app.querySelector("#list").innerHTML = "";
  rooms.forEach((room) => {
    app.querySelector(
      "#list"
    ).innerHTML += `<li data-room-id="${room.roomId}">${room.title}</li>`;
  });
}

function videoRoom() {
  document.querySelector("#app").innerHTML = `
    <div>
      <ol id="userList"></ol>
      <div id="videos"></div>
      <button id="call">call</button>
      <button id="hangup">hangup</button>
      <button id="hangout">hangout</button>
      <button id="out">room out</button>
    </div>  
  `;
}

init();
