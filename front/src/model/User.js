export class User extends RTCPeerConnection {
  stream = null;
  video = null;
  roomId = null;
  sid = null;
  constructor(sid, configurations) {
		super(configurations);
    this.sid = sid;
  }
  setRoomId(roomId) {
    this.roomId = roomId;
  }
}
