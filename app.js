const socket = io('https://back-cxwc.onrender.com'); // Adjust URL if needed

let localStream;
let peerConnection;
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Get user media (Microphone)
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => { 
        localStream = stream; 
        document.getElementById('localAudio').srcObject = localStream;
    })
    .catch(err => console.error('Error accessing microphone:', err));

// Join Room
const joinRoomForm = document.getElementById('joinRoomForm');
joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const room = document.getElementById('room').value;

    socket.emit('joinRoom', { name, room });
});

// Send message
const messageForm = document.getElementById('messageForm');
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const text = document.getElementById('message').value;
    const room = document.getElementById('room').value;
    socket.emit('message', { name, text, room });
    document.getElementById('message').value = '';
});

// Upload Image
const imageUploadForm = document.getElementById('imageUploadForm');
imageUploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData();
    const file = document.getElementById('imageUpload').files[0];
    formData.append('image', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(res => res.json())
    .then(data => {
        const name = document.getElementById('name').value;
        const room = document.getElementById('room').value;
        socket.emit('imageMessage', { name, imageUrl: data.imageUrl, room });
    })
    .catch(err => console.error('Error uploading image:', err));
});

// Listen for new messages
socket.on('message', (message) => {
    const messageElement = document.createElement('li');
    messageElement.innerHTML = `<strong>${message.name}</strong> <span>${message.time}</span>: ${message.text}`;
    document.getElementById('chatDisplay').appendChild(messageElement);
});

// Listen for active users
socket.on('activeUsers', (users) => {
    const activeMembersList = document.getElementById('activeMembersList');
    activeMembersList.innerHTML = ''; // Clear previous list
    users.forEach(user => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${user.name} <button class="call-btn" data-username="${user.name}">📞 Call</button>`;
        activeMembersList.appendChild(listItem);
    });

    // Call button functionality
    document.querySelectorAll('.call-btn').forEach(button => {
        button.addEventListener('click', () => {
            const userToCall = button.getAttribute('data-username');
            peerConnection = new RTCPeerConnection(configuration);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('callUser', { to: userToCall, signal: event.candidate, from: socket.id });
                }
            };

            peerConnection.createOffer().then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('callUser', { to: userToCall, signal: offer, from: socket.id });
            });
        });
    });
});

// Receive Call
socket.on('incomingCall', ({ from, signal }) => {
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('answerCall', { to: from, signal: event.candidate });
        }
    };

    peerConnection.setRemoteDescription(signal);
    peerConnection.createAnswer().then(answer => {
        peerConnection.setLocalDescription(answer);
        socket.emit('answerCall', { to: from, signal: answer });
    });
});

// Accept Call
socket.on('callAccepted', signal => {
    peerConnection.setRemoteDescription(signal);
    const remoteAudio = document.getElementById('remoteAudio');
    peerConnection.ontrack = event => {
        remoteAudio.srcObject = event.streams[0];
    };
});

