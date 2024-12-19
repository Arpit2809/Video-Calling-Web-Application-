const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const peers = {};
const myPeer = new Peer(undefined, {
    host: "/",
    port: "3001",
});
const myVideo = document.createElement("video");
myVideo.muted = true;

async function getMediaStream() {
    try {
        return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
    } catch (error) {
        console.error("Error accessing media devices.", error);
        return null; // Return null if there's an error
    }
}

myPeer.on("call", async (call) => {
    console.log("Received call from: " + call.peer);
    const mystream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    call.answer(mystream);
    const video = document.createElement("video");
    // this will handle upcoming stream
    call.on("stream", (userVideoStream) => {
        console.log("answering to stream event and about to add userVideo");
        addVideoStream(video, userVideoStream);
    });
    call.on("close", () => {
        video.remove();
    });
    peers[call.peer] = call;
});

myPeer.on("open", (id) => {
    console.log("peer_client is ON with id: " + id);
    socket.emit("join-room", ROOM_ID, id); // Join the room when first connected
});

socket.on("user-connected", async (another_userId) => {
    console.log("user-connected: " + another_userId);
    const mystream = await getMediaStream();
    connectToNewUser(another_userId, mystream); //will send and receive the stream
});

socket.on("user-disconnected", (userId) => {
    console.log("user- disconnected with id: " + userId);
    if (peers[userId]) peers[userId].close();
});

// Automatically join the room and set up the video call on page load
async function initializeCall() {
    const mystream = await getMediaStream(); // Get the media stream on page load
    if (mystream) {
        addVideoStream(myVideo, mystream); // Always add the local video stream
    }
}

function connectToNewUser(another_userId, mystream) {
    console.log("calling peer: " + another_userId);

    const call = myPeer.call(another_userId, mystream);
    const video = document.createElement("video");
    //handle upcoming stream
    call.on("stream", (remoteStream) => {
        console.log("answering to stream event and about to add userVideo");
        addVideoStream(video, remoteStream);
    });
    call.on("close", () => {
        video.remove();
    });
    peers[another_userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
    });
    videoGrid.append(video);
}

// Get the disconnect button element
const toggleButton = document.getElementById("disconnect-button");

toggleButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (socket.connected) {
        toggleButton.innerText = "Connect";
        socket.disconnect();
        Object.values(peers).forEach((call) => call.close());
        // videoGrid.innerHTML = ""; // Clear the video grid on disconnect
    } else {
        toggleButton.innerText = "Disconnect";
        socket.connect();
        socket.emit("join-room", ROOM_ID, myPeer.id); // Rejoin the room
    }
});

// Initialize the call when the page loads
initializeCall();
