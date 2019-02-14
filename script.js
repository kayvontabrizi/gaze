// throw exception if the user fails simple password prompt
var pass = prompt("Password?", "<password goes here>");
if (pass === null || md5(pass+'flarp') !== '4bc08f05a6320a858a64cba8f4d237d2') throw new Error("Incorrect password!");

// generate hash if not given
if (!location.hash) location.hash = Math.floor(Math.random()*0xFFFFFF).toString(16);

// identify the room hash
const room_hash = location.hash.substring(1);

// create ScaleDrone object and connect to channel
const drone = new ScaleDrone('LFHX9cAVqHdPv9Lh');

// construct room name from hash
const room_name = 'observable-'+room_hash;

// create peer connection configuration
const pc_config = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
};

// track local and remote video objects
var local_video = document.querySelector("#localVideo");
var remote_video = document.querySelector("#remoteVideo");

// configure getUserMedia constraints
var constraints = {video: true, audio: true};

// publish data in room 
function message (data) {
    drone.publish({room: room_name, message: data});
};

// error handling function
function logError (error) {
    // log and return if any error
    if (error) return console.error(error);
};

// set and publish the peer connection's description
function setSendLocalDescription (description) {
    // set local description
    pc.setLocalDescription(description)

    // upon success publish the local description
    .then(() => {
        message({'sdp': pc.localDescription})
    })

    // catch and log any error
    .catch(logError); 
};

// handle opening a connection to scaledrone
drone.on('open', error => {
    // log and return if any errors
    if (error) return console.error(error);

    // create a room object by subscribe to the room
    room = drone.subscribe(room_name)

    // handle opening a connection to room
    room.on('open', logError);

    // process members list upon receiving it
    room.on('members', members => {
        // alert and return if room has more than 2 members
        if (members.length > 2) return alert('The room is full.');

        // the second user to connect will make the offer
        const is_offerer = members.length === 2;

        // setup WebRTC
        setupWebRTC(is_offerer);

        // setup signaling handlers
        setupSignaling();
    });
});

// creates and handles a peer connection
function setupWebRTC(is_offerer) {
    // create a peer connection from configuration
    pc = new RTCPeerConnection(pc_config);
    
    // deliver ICE agent to peer upon receipt
    pc.onicecandidate = event => {
        if (event.candidate) message({'candidate': event.candidate});
    };
    
    // if user is offer, create offer
    if (is_offerer) {
        // create an offer whenever negotiation is needed
        pc.onnegotiationneeded = () => {
            // create an offer
            pc.createOffer()

            // upon success set the peer connection's local description
            .then(setSendLocalDescription)

            // catch and log any error
            .catch(logError);
        };
    }
    
    // upon remote stream addition, set remote video source to stream
    pc.onaddstream = event => {
        remote_video.srcObject = event.stream;
    };

    // verify getUserMedia is available
    if (navigator.mediaDevices.getUserMedia) {
        // initialize getUserMedia with constraints
        navigator.mediaDevices.getUserMedia(constraints)

        // upon success
        .then(stream => {
            // set local video source to stream
            local_video.srcObject = stream;

            // add stream to peer connection
            pc.addStream(stream);
        })

        // catch and log any error
        .catch(logError);
    }

    // complain if not available
    else console.log("The browser doesn't support `getUserMedia`.");
};

// handles receipt of scaledrone signaling data
function setupSignaling() {
    // process scaledrone data upon receipt
    room.on('data', (message, client) => {
        // return if client is self
        if (!client || client.id === drone.clientId) return;

        // check message for a session description
        if (message.sdp) {
            // set the peer connection's remote description
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp))

            // upon success, answer any offer
            .then(() => {
                // verify remote description is an offer
                if (pc.remoteDescription.type === 'offer') {
                    // create an answer
                    pc.createAnswer()

                    // upon success set the peer connection's local description
                    .then(setSendLocalDescription)

                    // catch and log any error
                    .catch(logError);
                }
            })

            // catch and log any error
            .catch(logError);
        }

        // check message for an ICE candidate
        else if (message.candidate) {
            // add any new ICE candidate to our peer connection
            pc.addIceCandidate(new RTCIceCandidate(message.candidate))

            // catch and log any error
            .catch(logError)
        }
    });
}