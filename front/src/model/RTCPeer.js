const PC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export class RTCPeer {
  peer = null;
  /** @type {MediaStream} */localStream = null;
  video = null;

  socket = null;

  constructor(socket) {
    this.socket = socket;
		this.createPeerConnection()
  }

  setupVideo() {
    const video = document.createElement("video");
    video.autoplay = true;
    this.video = video;
  }
  addVideoStream() {
    this.video.srcObject = this.localStream;
    this.localStream.getTracks().forEach((track) => {
      /** @type {RTCPeerConnection} */ (this.peer).addTrack(
        track,
        this.localStream
      );
    });
  }

  async getUserMedia() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    this.localStream = stream;
  }

  createPeerConnection() {
    const pc = new RTCPeerConnection(PC_CONFIG);
    pc.onicecandidate = this.onIcecandidate;
    pc.ondatachannel = this.onDatachannel;
    pc.ontrack = this.onTrack;
    pc.onconnectionstatechange = this.onConnectionStateChange;
    this.peer = pc;
  }

  setLocalDescription(sid, session) {
    return /** @type {RTCPeerConnection} */ (
      this.peer
    ).setLocalDescription(new RTCSessionDescription(session));
  }

  sendLocalDescription(sid) {
    const session = /** @type {RTCPeerConnection} */ (this.peer)
      .localDescription;
    this.sendData({
      sid: sid,
      type: session.type,
      sdp: session.sdp,
    });
  }

  sendData(data) {
    this.socket.send(JSON.stringify(data));
  }

  onIcecandidate(e) {
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
  onDatachannel(e) {
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
  onTrack(e) {
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
  onConnectionStateChange(e) {
    console.log("peer connection change", e);
  }
}
