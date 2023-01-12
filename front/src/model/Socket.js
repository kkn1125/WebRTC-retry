import { peers } from "../util/globals";
import { RTCPeer } from "./RTCPeer";

export class Socket {
  ws = null;
  socketId = null;
  dataChannel = null;

  constructor() {
    const socket = new WebSocket("ws://localhost:3000");
    socket.onopen = this.onOpen;
    socket.onmessage = this.onMessage;
    socket.onerror = this.onError;
    socket.onclose = this.onClose;
    this.ws = socket;
  }

  onOpen() {
    console.log("socket open");
  }

  async onMessage(message) {
    const json = JSON.parse(message.data);
    const sid = json.sid;
    delete json.sid;
    if (json.type === "ready") {
      this.socketId = sid;
      peers.set(sid, new RTCPeer(this.ws));
      peers.get(sid).setupVideo();
      await peers.get(sid).getUserMedia();
      peers.get(sid).addVideoStream();

      // localVideo.srcObject = localStream;
      // localStream.getTracks().forEach((track) => {
      //   /** @type {RTCPeerConnection} */ (peers.get(sid)).addTrack(
      //     track,
      //     localStream
      //   );
      // });
      this.dataChannel = /** @type {RTCPeerConnection} */ (
        peers.get(sid).peer
      ).createDataChannel("chat");
      // console.log(dataChannel);
      this.dataChannel.onopen = (e) => {
        console.log("datachannel open!");
      };
      this.dataChannel.onmessage = (e) => {
        console.log("onmessage", e);
      };
      this.dataChannel.onerror = (e) => {
        console.log("onerror", e);
      };
      this.dataChannel.onclose = (e) => {
        console.log("onclose", e);
      };
      /** @type {RTCPeerConnection} */ (peers.get(sid).peer)
        .createOffer()
        .then((offer) => peers.get(sid).peer.setLocalDescription(sid, offer))
        .then(() => peers.get(sid).peer.sendLocalDescription(sid))
        .then(() => {})
        .catch((err) => {
          console.log("answer error", err);
        });
    } else if (json.type === "offer") {
      peers.get(sid).peer.setRemoteDescription(new RTCSessionDescription(json));
      /** @type {RTCPeerConnection} */ (peers.get(sid).peer)
        .createAnswer()
        .then((answer) => peers.get(sid).peer.setLocalDescription(sid, answer))
        .then(() => peers.get(sid).peer.sendLocalDescription(sid))
        .then(() => {})
        .catch((err) => {
          console.log("answer error", err);
        });
      addPendingCandidates(sid);
    } else if (json.type === "answer") {
      try {
        const state = peers.get(sid).peer.signalingState;
        console.log(state, json);
        peers
          .get(sid)
          .setRemoteDescription(new RTCSessionDescription(json))
          .catch((e) => console.log(e));
      } catch (e) {
        console.log(e);
      }
    } else if (json.type === "candidate") {
      peers.get(sid).peer.addIceCandidate(json.candidate);
    }
  }

  onError(err) {
    console.log("socket error", err);
  }

  onClose() {
    console.log("socket close");
  }
}
