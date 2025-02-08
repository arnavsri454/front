const socket = io('https://back-cxwc.onrender.com'); // Adjust URL if needed

let localStream;
const peerConnections = {}; // Store connections for each peer
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Get user media (Microphone)
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => { 
        localStream = stream; 
        const localAudio = document.getElementById('localAudio');
        if (localAudio) {
            localAudio.srcObject = localStream;
        } else {
            console.error("Element with ID 'localAudio' not found in the DOM.");
        }
    })
    .catch(err => console.error('Error accessing microphone:', err));

// Join Room
document.getElementById('joinRoomForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const room = document.getElementById('room').value;
    socket.emit('joinRoom', { name, room });
});

// Handle Chat Messages
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const text = document.getElementById('message').value;
    const room = document.getElementById('room').value;
    socket.emit('message', { name, text, room });
    document.getElementById('message').value = '';
});

// Handle Call Button Click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('call-btn')) {
        startGroupCall();
    }
});

// Start Group Call
function startGroupCall() {
    socket.emit('startGroupCall');
}

// Handle Incoming Group Call Request
socket.on('groupCallStarted', ({ from, roomUsers }) => {
    roomUsers.forEach(user => {
        if (user.id !== socket.id && !peerConnections[user.id]) {
            initiatePeerConnection(user.id);
        }
    });
});

// Create a New Peer Connection
function initiatePeerConnection(peerId) {
    if (peerConnections[peerId]) {
        console.warn(`Peer connection already exists for ${peerId}`);
        return peerConnections[peerId];
    }

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[peerId] = peerConnection;

    // Add local audio track
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('sendICE', { to: peerId, candidate: event.candidate });
        }
    };

    // Handle incoming audio stream
    peerConnection.ontrack = event => {
        let remoteAudio = document.getElementById(`remoteAudio-${peerId}`);
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = `remoteAudio-${peerId}`;
            remoteAudio.controls = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
    };

    // Create and send offer
    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('sendOffer', { to: peerId, offer });
        });

    return peerConnection;
}

// Handle Offer from Peer
socket.on('receiveOffer', async ({ from, offer }) => {
    const peerConnection = initiatePeerConnection(from);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('sendAnswer', { to: from, answer });
});

// Handle Answer from Peer
socket.on('receiveAnswer', ({ from, answer }) => {
    peerConnections[from]?.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle Incoming ICE Candidate
socket.on('receiveICE', ({ from, candidate }) => {
    peerConnections[from]?.addIceCandidate(new RTCIceCandidate(candidate));
});

// Handle Disconnection
socket.on('userDisconnected', ({ userId }) => {
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
    }

    const remoteAudio = document.getElementById(`remoteAudio-${userId}`);
    if (remoteAudio) {
        remoteAudio.parentNode.removeChild(remoteAudio); // Ensure proper removal
    }
});
