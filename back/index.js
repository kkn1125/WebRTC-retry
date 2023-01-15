/* A quite detailed WebSockets upgrade example "async" */

import uWS from "uWebSockets.js";
import { Room } from "./model/Room.js";
const port = 3000;

const rooms = new Map();
const users = new Map();
let sid = 0;
let roomId = 0;

const app = uWS
  .App()
  .ws("/*", {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 32,
    /* Handlers */
    upgrade: (res, req, context) => {
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      /* Keep track of abortions */
      const upgradeAborted = { aborted: false };

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
      const secWebSocketKey = req.getHeader("sec-websocket-key");
      const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
      const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

      /* Simulate doing "async" work before upgrading */
      setTimeout(() => {
        console.log(
          "We are now done with our async task, let's upgrade the WebSocket!"
        );

        if (upgradeAborted.aborted) {
          console.log("Ouch! Client disconnected before we could upgrade it!");
          /* You must not upgrade now */
          return;
        }

        /* This immediately calls open handler, you must not use res after this call */
        res.upgrade(
          {
            url: url,
          },
          /* Use our copies here */
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );
      }, 1000);

      /* You MUST register an abort handler to know if the upgrade was aborted by peer */
      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });
    },
    open: (ws) => {
      ws.subscribe("broadcast");
      ws.subscribe(String(sid));
      ws.send(
        JSON.stringify({
          type: "ready",
          sid: sid,
          rooms: Array.from(rooms.values()),
        })
      );
      users.set(ws, { sid });
      console.log("A WebSocket connected with URL: " + ws.url);
      sid++;
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      const sid = users.get(ws).sid;
      const json = JSON.parse(new TextDecoder().decode(message));
      console.log(json);
      switch (json.type) {
        case "create:room":
          rooms.set(roomId, new Room({ roomId, ...json.options }));
          app.publish(
            "broadcast",
            JSON.stringify({
              type: "create:room",
              rooms: Array.from(rooms.values()),
            }),
            isBinary
          );
          roomId++;
          break;
        case "join:room":
          if (rooms.get(json.roomId).limit > rooms.get(json.roomId).size()) {
            ws.subscribe(String(json.roomId));
            rooms.get(json.roomId).addUser(json.sid);
            app.publish(
              String(json.roomId),
              JSON.stringify({
                type: "join:room",
                sid: json.sid,
                roomId: json.roomId,
                rooms: Array.from(rooms.values()),
                is_full: false,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "join:room",
                sid: json.sid,
                roomId: json.roomId,
                is_full: true,
              })
            );
          }
          break;
        default:
          ws.publish(
            String(json.roomId),
            JSON.stringify(
              Object.assign(json, { roomId: json.roomId, sid: sid })
            ),
            isBinary
          );
          break;
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
    },
  })
  .any("/*", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });
