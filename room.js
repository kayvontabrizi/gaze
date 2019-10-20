// define a Room object for peer-to-peer videochatting management
class Room {
    // configure Room and underlying ScaleDrone object for two-person communication
    constructor(drone, room_name, pc_config, local_video, remote_video, player=null, constraints={video: true, audio: true}) {
        // store room name, PeerConnection configuration, video DOM elements, a player object, and getUserMedia constraints
        this.room_name = room_name;
        this.pc_config = pc_config;
        this.local_video = local_video;
        this.remote_video = remote_video;
        this.constraints = constraints;
        this.player = player;

        // instantiate null room, peer connection and empty candidate queue globals
        this.room = null;
        this.pc = null;
        this.candidate_queue = [];

        // handle opening a connection to scaledrone
        drone.on('open', error => {
            // log and return if any errors
            if (error) return utils.error(error);

            // create a room object by subscribe to the room
            this.room = drone.subscribe(this.room_name);

            // handle opening a connection to room
            this.room.on('open', msg => {
                // throw an error if any message is passed
                if (msg !== undefined) utils.error(msg);
            });

            // process members list upon receiving it
            this.room.on('members', members => {
                // alert and return if room has more than 2 members
                if (members.length > 2) return alert('The room is full.');

                // the second user to connect will make the offer
                const offering = members.length === 2;

                // setup PeerConnection
                this.setupPeerConnection(offering);

                // setup signaling handlers
                this.setupSignaling();
            });
        });

        // store the ScaleDrone object
        this.drone = drone;
    }

    // publish data in room
    publish(data) {
        // call underlying drone publishing method
        this.drone.publish({room: this.room_name, message: data});
    }

    // set and publish the peer connection's description
    setSendLocalDescription(local_sdp) {
        // set local description
        utils.debug('Set local SDP.');
        return this.pc.setLocalDescription(local_sdp);
    }

    // creates and handles a peer connection
    setupPeerConnection(offering) {
        // create a peer connection from configuration
        this.pc = new RTCPeerConnection(this.pc_config);

        // deliver ICE agent to peer upon receipt
        this.pc.onicecandidate = event => {
            if (event.candidate) this.publish({'candidate': event.candidate});
        };

        // upon remote stream addition, set remote video source to stream
        this.pc.ontrack = event => {
            this.remote_video.srcObject = event.streams[0];
        };

        // if offering, prepare PeerConnection to create an offer upon negotiation
        if (offering) {
            // create an offer whenever negotiation is needed
            this.pc.onnegotiationneeded = () => {
                // track whether or not negotiation has already begun
                if (this.pc.is_negotiating === true) return;
                else this.pc.is_negotiating = true;

                // create an offer
                this.pc.createOffer()

                // upon success set the peer connection's local description
                .then((local_sdp) => {
                    this.setSendLocalDescription(local_sdp);
                })

                // upon further success publish the local description
                .then(() => this.publish({'sdp': this.pc.localDescription}))

                // catch and log any error
                .catch(utils.warning)

                //
                .finally(() => {
                    this.pc.is_negotiating = false;
                });
            };
        }

        // otherwise do nothing
        else this.pc.onnegotiationneeded = null;

        // unhandled events
        this.pc.onremovetrack = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onicegatheringstatechange = null;
        this.pc.onsignalingstatechange = null;

        // verify getUserMedia is available
        if (navigator.mediaDevices.getUserMedia) {
            // initialize getUserMedia with constraints
            navigator.mediaDevices.getUserMedia(this.constraints)

            // upon success
            .then(stream => {
                // set local video source to stream and mute
                this.local_video.srcObject = stream;
                this.local_video.controls = false;
                this.local_video.muted = true;

                // add stream tracks to peer connection
                stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
            })

            // catch and log any error
            .catch(utils.warning);
        }

        // complain if not available
        else utils.warning("The browser doesn't support `getUserMedia`.");
    }

    // handles receipt of scaledrone signaling data
    setupSignaling() {
        // process scaledrone data upon receipt
        this.room.on('data', (message, client) => {
            // return if client is self
            if (!client || client.id === this.drone.clientId) return;

            // check message for a description
            if (message.sdp) {
                // set the peer connection's remote description
                var remote_sdp = new RTCSessionDescription(message.sdp);
                utils.debug('Set remote SDP.');
                this.pc.setRemoteDescription(remote_sdp)

                // upon success, answer any offer
                .then(() => {
                    // verify remote description is an offer
                    if (this.pc.remoteDescription.type === 'offer') {
                        // log the offer
                        utils.debug('Received offer.');

                        // create an answer
                        this.pc.createAnswer()

                        // upon success set the peer connection's local description
                        .then((local_sdp) => {
                            this.setSendLocalDescription(local_sdp);
                        })

                        // upon further success publish the local description
                        .then(() => this.publish({'sdp': this.pc.localDescription}))

                        // catch and log any error
                        .catch(utils.warning);
                    }

                    // log if it's an answer
                    else if (this.pc.remoteDescription.type === 'answer') utils.debug('Received answer.');

                    // otherwise log unrecognized sdp type
                    else utils.warning(this.pc.remoteDescription.type);
                })

                // catch and log any error
                .catch(utils.warning);
            }

            // check message for an ICE candidate
            else if (message.candidate) {
                // add ICE candidate to a processing queue
                this.candidate_queue.push(message.candidate);
            }

            // check message for a player change
            else if (message.new_player && this.player) {
                // report debugging info
                utils.debug('Room: Incoming message!');
                utils.debug(message);
                utils.debug('Room.player: '+this.player.constructor.name);

                // check whether the current and new players match
                if (this.player.constructor.name != message.new_player) {
                    // close the current player
                    this.player.close();

                    // switch to the new player
                    switch (message.new_player) {
                        case 'YTPlayer':
                            this.player = main_ytplayer;
                            break;
                        case 'LocalPlayer':
                            this.player = main_local_player;
                            break;
                        default:
                            // throw an error for unfamiliar players
                            utils.error('Unrecognized player: '+message.new_player);
                    }

                    // open the new player
                    this.player.open();
                }
            }

            // check message for a player state
            else if (message.player_state && this.player) {
                // report debugging info
                utils.debug('Message received!');
                utils.debug(message.player_state);
                utils.debug(this.player);

                // if player types match, sync player state
                if (message.player_state.type === this.player.constructor.name) {
                    this.player.syncState(message.player_state);
                }
            }

            // throw error if any other message
            else utils.error(message);

            // ensure peer connection has a remote description
            if (this.pc.remoteDescription) {
                // loop through candidates in queue
                this.candidate_queue.forEach(candidate => {
                    // add any new ICE candidate to our peer connection
                    var ice_candidate = new RTCIceCandidate(candidate);
                    this.pc.addIceCandidate(ice_candidate)

                    // catch and log any error
                    .catch(utils.warning);
                });

                // clear candidate queue
                this.candidate_queue = [];
            }
        });
    }
}