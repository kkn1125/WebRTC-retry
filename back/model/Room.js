export class Room {
  roomId = 0;
  title = null;
  limit = 0;
  userList = [];
  options = {
    video: true,
    audio: true,
    chat: true,
  };
  constructor({ roomId, title, limit, options }) {
    this.roomId = roomId;
    this.title = title;
    this.limit = limit;
    Object.assign(this.options, options);
  }
  addUser(user) {
    this.userList.push(user);
  }
  size() {
    return this.userList.length;
  }
}
