const socket = io('https://back-cxwc.onrender.com'); // Backend URL
let username = '';
let currentRoom = '';

socket.on('connect_error', () => {
  alert('The server is currently unavailable. Please try again later.');
});

document.querySelector('.form-join').addEventListener('submit', (event) => {
    event.preventDefault();
    username = document.getElementById('name').value;
    currentRoom = document.getElementById('room').value;

    socket.emit('joinRoom', { name: username, room: currentRoom });
});

socket.on('message', (message) => {
    const chatDisplay = document.querySelector('.chat-display');
    const li = document.createElement('li');
    li.innerHTML = `<strong>${message.name}</strong>: ${message.text} <span>${message.time}</span>`;
    chatDisplay.appendChild(li);
});

socket.on('chatHistory', (history) => {
    const chatDisplay = document.querySelector('.chat-display');
    chatDisplay.innerHTML = '';
    history.forEach((message) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${message.name}</strong>: ${message.text} <span>${message.time}</span>`;
        chatDisplay.appendChild(li);
    });
});

document.querySelector('.form-msg').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('message').value;
    socket.emit('message', { name: username, text: message, room: currentRoom });
    document.getElementById('message').value = '';
});

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
setInterval(() => {
  fetch('https://your-backend-url.onrender.com/ping')
    .catch((err) => console.error('Backend ping failed:', err));
}, 5 * 60 * 1000); // Ping every 5 minutes

