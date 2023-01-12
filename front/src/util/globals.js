export const app = document.querySelector("#app");
export const PC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
export const peers = new Map();