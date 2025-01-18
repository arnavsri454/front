const socket = io('https://back-cxwc.onrender.com'); // Backend URL
let username = '';
let currentRoom = '';
let typingTimeout;

// Handle connection error
socket.on('connect_error', () => {
    alert('The server is currently unavailable. Please try again later.');
});

// Join Room
document.querySelector('.form-join').addEventListener('submit', (event) => {
    event.preventDefault();
    username = document.getElementById('name').value.trim();
    currentRoom = document.getElementById('room').value.trim();

    if (!username || !currentRoom) {
        alert('Name and Room are required.');
        return;
    }

    socket.emit('joinRoom', { name: username, room: currentRoom });
});

// Handle messages
socket.on('message', (message) => {
    const chatDisplay = document.querySelector('.chat-display');
    const li = document.createElement('li');
    li.innerHTML = `<strong>${message.name}</strong>: ${message.text} <span>${message.time}</span>`;
    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto-scroll to the bottom
});

// Load chat history
socket.on('chatHistory', (history) => {
    const chatDisplay = document.querySelector('.chat-display');
    chatDisplay.innerHTML = '';
    history.forEach((message) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${message.name}</strong>: ${message.text} <span>${message.time}</span>`;
        chatDisplay.appendChild(li);
    });
    chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto-scroll
});

// Send Message
document.querySelector('.form-msg').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('message').value.trim();
    if (!message) return;

    socket.emit('message', { name: username, text: message, room: currentRoom });
    document.getElementById('message').value = '';
});

// Handle typing indicator
const messageInput = document.getElementById('message');
messageInput.addEventListener('input', () => {
    socket.emit('typing', { name: username, room: currentRoom });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { room: currentRoom });
    }, 1000);
});

socket.on('userTyping', (data) => {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.textContent = `${data.name} is typing...`;
});

socket.on('userStoppedTyping', () => {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.textContent = '';
});

// Display active members
socket.on('roomUsers', ({ room, users }) => {
    const activeMembersList = document.getElementById('activeMembersList');
    activeMembersList.innerHTML = users.map(user => `<li>${user.name}</li>`).join('');
});

// Upload Image
document.querySelector('.form-upload').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('imageUpload');
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch('https://back-cxwc.onrender.com/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload image.');

        const { imageUrl } = await response.json();
        socket.emit('imageMessage', { name: username, imageUrl, room: currentRoom });
    } catch (error) {
        console.error('Error uploading image:', error);
    }
});

// Fix ping interval bug
setInterval(() => {
    fetch('https://back-cxwc.onrender.com/ping') // Correct URL
        .catch((err) => console.error('Backend ping failed:', err));
}, 5 * 60 * 1000); // Ping every 5 minutes
