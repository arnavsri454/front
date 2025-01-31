 const socket = io('https://back-cxwc.onrender.com'); // Backend URL
let username = '';
let currentRoom = '';
let typingTimeout;
let localStream;
let peerConnections = {}; // Store peer connections

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
    chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto-scroll
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
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.textContent = `${data.name} is typing...`;
});

socket.on('userStoppedTyping', () => {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.textContent = '';
});

// Display active members
socket.on('roomUsers', ({ room, users }) => {
    const activeMembersList = document.getElementById('activeMembersList');
    activeMembersList.innerHTML = users
        .map(user => `<li><span class="user-name">${user.name}</span> <button class="call-btn" data-username="${user.name}">📞 Call</button></li>`)
        .join('');

    // Add event listeners for call buttons
    document.querySelectorAll('.call-btn').forEach(button => {
        button.addEventListener('click', () => startCall(button.getAttribute('data-username')));
    });
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
    fetch('https://back-cxwc.onrender.com/ping')
        .catch((err) => console.error('Backend ping failed:', err));
}, 5 * 60 * 1000); // Ping every 5 minutes

// WebRTC Audio Call
async function startCall(targetUser) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const peerConnection = new RTCPeerConnection();
        peerConnections[targetUser] = peerConnection;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('iceCandidate', { targetUser, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            document.getElementById('remoteAudio').srcObject = event.streams[0];
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('callUser', { targetUser, offer });
    } catch (error) {
        console.error('Error starting call:', error);
    }
}

socket.on('receiveCall', async ({ caller, offer }) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const peerConnection = new RTCPeerConnection();
        peerConnections[caller] = peerConnection;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('iceCandidate', { targetUser: caller, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            document.getElementById('remoteAudio').srcObject = event.streams[0];
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answerCall', { caller, answer });
    } catch (error) {
        console.error('Error answering call:', error);
    }
});

socket.on('callAccepted', async ({ answer, targetUser }) => {
    if (peerConnections[targetUser]) {
        await peerConnections[targetUser].setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('iceCandidate', ({ candidate, targetUser }) => {
    if (peerConnections[targetUser]) {
        peerConnections[targetUser].addIceCandidate(new RTCIceCandidate(candidate));
    }
});
