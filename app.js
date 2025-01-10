const nameInput = document.getElementById('name');
const roomInput = document.getElementById('room');
const messageInput = document.getElementById('message');
const imageUploadInput = document.getElementById('imageUpload');
const chatDisplay = document.querySelector('.chat-display');
const joinForm = document.querySelector('.form-join');
const messageForm = document.querySelector('.form-msg');
const uploadForm = document.querySelector('.form-upload');

// Initialize Socket.IO connection
const socket = io('http://localhost:3500', {
    withCredentials: true  // Include credentials if needed
});

socket.on('connect', () => {
    console.log('Successfully connected to the server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from the server');
});

joinForm.addEventListener('submit', joinRoom);
messageForm.addEventListener('submit', sendMessage);
uploadForm.addEventListener('submit', sendImage);

function joinRoom(e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    const room = roomInput.value.trim();

    if (name && room) {
        console.log(`User ${name} is joining room ${room}`);
        socket.emit('joinRoom', { name, room });
        document.querySelector('.form-join').style.display = 'none';
        document.querySelector('.form-msg').style.display = 'flex';
        chatDisplay.innerHTML = '';  // Clear chat display
    }
}

function sendMessage(e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    const name = nameInput.value.trim();
    const room = roomInput.value.trim();

    if (message && name && room) {
        console.log(`Sending message: ${message} to room ${room}`);
        socket.emit('message', { name, text: message, room });
        messageInput.value = '';  // Clear input
    }
}

function sendImage(e) {
    e.preventDefault();
    const file = imageUploadInput.files[0];
    const name = nameInput.value.trim();
    const room = roomInput.value.trim();

    if (file && name && room) {
        const formData = new FormData();
        formData.append('image', file);
        fetch('http://localhost:3500/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                socket.emit('imageMessage', { name, imageUrl: data.imageUrl, room });
                imageUploadInput.value = '';  // Clear input
            })
            .catch(error => console.error('Error uploading image:', error));
    }
}

// Handle incoming text messages
socket.on('message', ({ name, text, time }) => {
    console.log('Received message:', name, text, time);
    const messageElement = document.createElement('li');
    messageElement.innerHTML = `<strong>${name}</strong> (${time}): ${text}`;
    chatDisplay.appendChild(messageElement);
});

// Handle incoming chat history
socket.on('chatHistory', (history) => {
    console.log('Chat history:', history);
    history.forEach(msg => {
        const messageElement = document.createElement('li');
        messageElement.innerHTML = `<strong>${msg.name}</strong> (${msg.time}): ${msg.text}`;
        chatDisplay.appendChild(messageElement);
    });
});
