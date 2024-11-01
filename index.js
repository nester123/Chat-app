const express = require("express");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";

const expressServer = app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);

const UsersState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

const io = new Server(expressServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5500", "http://127.0.0.1:5500"],
  },
});

io.on("connection", (socket) => {
  socket.emit("message", buildMessage(ADMIN, "Welcome to Whim!"));

  socket.on("enterRoom", ({ name, room }) => {
    const prevRoom = getUsers(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit("message", buildMessage(ADMIN, `${name} has left the room`));
    }

    const user = activateUser(socket.id, name, room);
    if (prevRoom) {
      io.to(prevRoom).emit("userList", { users: getUsersInTheRoom(prevRoom) });
    }

    socket.join(user.room);
    socket.emit("message", buildMessage(ADMIN, `You have joined the ${user.room} chat room`));
    socket.broadcast.to(user.room).emit("message", buildMessage(ADMIN, `${user.name} has joined the room`));
    io.to(user.room).emit("userList", { users: getUsersInTheRoom(user.room) });
    io.emit("roomsList", { rooms: getAllActiveRooms() });
  });

  socket.on("disconnect", () => {
    const user = getUsers(socket.id);
    userLeavesApp(socket.id);

    if (user) {
      io.to(user.room).emit("message", buildMessage(ADMIN, `${user.name} has left the room`));
      io.to(user.room).emit("userList", { users: getUsersInTheRoom(user.room) });
      io.emit("roomsList", { rooms: getAllActiveRooms() });
    }
  });

  socket.on("message", ({ name, text }) => {
    const room = getUsers(socket.id)?.room;
    if (room) {
      io.to(room).emit("message", buildMessage(name, text));
    }
  });

  socket.on("activity", (name) => {
    const room = getUsers(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMessage(name, text) {
  return {
    name,
    text,
    time: new Date().toLocaleTimeString(),
  };
}

function activateUser(id, name, room) {
  const user = {
    id,
    name,
    room,
  };
  UsersState.setUsers([
    ...UsersState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeavesApp(id) {
  UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUsers(id) {
  return UsersState.users.find((user) => user.id === id);
}

function getUsersInTheRoom(room) {
  return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return Array.from(new Set(UsersState.users.map((user) => user.room)));
}
