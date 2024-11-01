const socket = io("https://whim-chat.onrender.com");
const activity = document.querySelector(".activity");
const usersList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const input = document.querySelector("#message");
const nameInput = document.querySelector("#name");
const chatRoom = document.querySelector("#room");
const chatDisplay = document.querySelector(".chat-display");

function saveMessageToLocal(room, message) {
  const messages = JSON.parse(localStorage.getItem(`messages_${room}`)) || [];
  messages.push(message);
  localStorage.setItem(`messages_${room}`, JSON.stringify(messages));
}

function loadMessagesFromLocal(room) {
  const messages = JSON.parse(localStorage.getItem(`messages_${room}`)) || [];
  messages.forEach(displayMessage);
}

function clearMessagesFromLocal(room) {
  localStorage.removeItem(`messages_${room}`);
}

function sendMessage(e) {
  e.preventDefault();
  if (nameInput.value && input.value && chatRoom.value) {
    const messageData = {
      text: input.value,
      name: nameInput.value,
      time: new Date().toLocaleTimeString(),
    };
    socket.emit("message", messageData);
    displayMessage(messageData);
    saveMessageToLocal(chatRoom.value, messageData);
    input.value = "";
  }
  input.focus();
}

function enterRoom(e) {
  e.preventDefault();
  if (nameInput.value && chatRoom.value) {
    chatDisplay.innerHTML = ""; // Clear current messages
    loadMessagesFromLocal(chatRoom.value); // Load saved messages
    socket.emit("enterRoom", {
      name: nameInput.value,
      room: chatRoom.value,
    });
  }
}

function displayMessage(data) {
  const { name, text, time } = data;
  const li = document.createElement("li");
  li.className = "post";
  li.className += name === nameInput.value ? " post--left" : " post--right";
  li.innerHTML = `
    <div class="post__header ${name === nameInput.value ? "post__header--user" : "post__header--reply"}">
      <span class="post__header--name">${name}</span>
      <span class="post__header--time">${time}</span>
    </div>
    <div class="post__text">${text}</div>
  `;
  chatDisplay.appendChild(li);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

document.querySelector(".form-msg").addEventListener("submit", sendMessage);
document.querySelector(".form-join").addEventListener("submit", enterRoom);

input.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.value);
});

socket.on("message", (data) => {
  activity.textContent = "";
  displayMessage(data);
  saveMessageToLocal(chatRoom.value, data); // Save message on receive
});

socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 1000);
});

socket.on('userList', ({ users }) => {
  showUsers(users);
});

function showUsers(users) {
  usersList.textContent = "";
  if (users) {
    usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      usersList.textContent += ` ${user.name}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ",";
      }
    });
  }
}

socket.on("roomsList", ({ rooms }) => {
  showRooms(rooms);
});

function showRooms(rooms) {
  roomList.textContent = ""; // Clear existing content
  if (rooms && rooms.length > 0) {
    roomList.innerHTML = `<em>Active Rooms:</em>`;
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`;
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += ",";
      }
    });
  }
}
