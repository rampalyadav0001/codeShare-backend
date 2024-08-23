import express from 'express';
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};
const io = new Server(server);
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);
  // listen for Join a room
  socket.on('join', ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit('joined', {
        clients,
        username,
        socketId: socket.id,
      });
    });
    // Listen for disconnecting
    socket.on('disconnecting', () => {
      const clients = getAllConnectedClients(roomId);
      clients.forEach(({ socketId }) => {
        io.to(socketId).emit('disconnected', {
          username: userSocketMap[socket.id],
          socketId: socket.id,
        });
      });
      socket.leave(roomId);
      delete userSocketMap[socket.id];
    });

    // Listen for code changes  it exclude the sender
    socket.on('code-change', ({ roomId, code }) => {
      const clients = getAllConnectedClients(roomId);
      clients.forEach(({ socketId }) => {
        if (socketId !== socket.id) {
          io.to(socketId).emit('code-change', {
            code,
          });
        }
      });
    });
    //  when a new user joins code sync
    socket.on('code-sync', ({ socketId, code }) => {
      io.to(socketId).emit('code-change', {
        code,
      });
    });

    // new format for code change it includes the sender
    // socket.on('code-change', ({ roomId, code }) => {
    //   io.from(roomId).emit('code-change', {
    //     code,
    //   });
    // });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
