// Assume jQuery is already included in your project

var AppProcess = (function () {

    var peers_connection_ids = [];
    var peers_connection = [];
    var remote_vid_stream = [];
    var remote_aud_stream = [];
    var local_div;
    var serverProcess;
    var audio;
    var isAudioMute = true;
    var rtp_aud_sender = [];
    var video_states = {
        None: 0,
        Camara: 1,
        ScreenShare: 2
    };
    var video_st = video_states.None;
    var videoCamTrack;
    var rtp_vid_senders = [];

    async function _init(SDP_function, my_connid) {
        serverProcess = SDP_function;
        my_connection_id = my_connid;
        eventProcess();
        local_div = document.getElementById("localVideoPlayer");
    }

    // Event handling
    function eventProcess() {
        $("#miceMuteUnmute").on("click", async function () {
            if (!audio) {
                await loadAudio();
            }
            if (!audio) {
                alert("Audio permission has not been granted");
                return;
            }
            if (isAudioMute) {
                audio.enabled = true;
                $(this).html("<span class='material-icons' style='width:100%;'>mic</span>");
                updateMediaSenders(audio, rtp_aud_sender);
                socket.emit("micCameraControl", { micOn: true, camOn: video_st === video_states.Camara });
            } else {
                audio.enabled = false;
                $(this).html("<span class='material-icons' style='width:100%;'>mic_off</span>");
                removeMediaSenders(rtp_aud_sender);
                socket.emit("micCameraControl", { micOn: false, camOn: video_st === video_states.Camara });
            }
            isAudioMute = !isAudioMute;
        });

        $("#videoCamOnOff").on("click", async function () {
            if (video_st === video_states.Camara) {
                await videoProcess(video_states.None);
                socket.emit("micCameraControl", { micOn: !isAudioMute, camOn: false });
            } else {
                await videoProcess(video_states.Camara);
                socket.emit("micCameraControl", { micOn: !isAudioMute, camOn: true });
            }
        });

        $("#ScreenShareOnOf").on("click", async function () {
            if (video_st === video_states.ScreenShare) {
                await videoProcess(video_states.None);
                socket.emit("micCameraControl", { micOn: !isAudioMute, camOn: false });
            } else {
                await videoProcess(video_states.ScreenShare);
                socket.emit("micCameraControl", { micOn: !isAudioMute, camOn: true });
            }
        });
    }

    async function loadAudio() {
        try {
            var astream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
            });
            audio = astream.getAudioTracks()[0];
            audio.enabled = false;
        } catch (e) {
            console.log(e);
        }
    }

    function connection_status(connection) {
        return connection && (connection.connectionState === "new" || connection.connectionState === "connecting" || connection.connectionState === "connected");
    }

    async function updateMediaSenders(track, rtp_senders) {
        for (var con_id in peers_connection_ids) {
            if (connection_status(peers_connection[con_id])) {
                if (rtp_senders[con_id] && rtp_senders[con_id].track) {
                    rtp_senders[con_id].replaceTrack(track);
                } else {
                    rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
                }
            }
        }
    }

    function removeMediaSenders(rtp_senders) {
        for (var con_id in peers_connection_ids) {
            if (rtp_senders[con_id] && connection_status(peers_connection[con_id])) {
                peers_connection[con_id].removeTrack(rtp_senders[con_id]);
                rtp_senders[con_id] = null;
            }
        }
    }

    function removeVideoStream(rtp_vid_senders) {
        if (videoCamTrack) {
            videoCamTrack.stop();
            videoCamTrack = null;
            local_div.srcObject = null;
            removeMediaSenders(rtp_vid_senders);
        }
    }

    async function videoProcess(newVideoState) {
        if (newVideoState === video_states.None) {
            $("#videoCamOnOff").html("<span class='material-icons' style='width:100%;'>videocam_off</span>");
            $("#ScreenShareOnOf").html('<span class="material-icons">present_to_all</span><div>Present Now</div>');

            video_st = newVideoState;
            removeVideoStream(rtp_vid_senders);
            return;
        }

        if (newVideoState === video_states.Camara) {
            $("#videoCamOnOff").html("<span class='material-icons'>videocam_off</span>");
        }
        try {
            var vstream = null;
            if (newVideoState === video_states.Camara) {
                vstream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1920, height: 1080 },
                    audio: false
                });
            } else if (newVideoState === video_states.ScreenShare) {
                vstream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: 1920, height: 1080 },
                    audio: false
                });

                vstream.oninactive = () => {
                    removeVideoStream(rtp_vid_senders);
                    $("#ScreenShareOnOf").html('<span class="material-icons">present_to_all</span><div>Present Now</div>');
                };
            }
            if (vstream && vstream.getVideoTracks().length > 0) {
                videoCamTrack = vstream.getVideoTracks()[0];
                if (videoCamTrack) {
                    local_div.srcObject = new MediaStream([videoCamTrack]);
                    updateMediaSenders(videoCamTrack, rtp_vid_senders);
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
        video_st = newVideoState;

        if (newVideoState === video_states.Camara) {
            $("#videoCamOnOff").html('<span class="material-icons" style="width: 100%;">videocam</span>');
            $("#ScreenShareOnOf").html('<span class="material-icons">present_to_all</span><div>Present Now</div>');
        } else if (newVideoState === video_states.ScreenShare) {
            $("#videoCamOnOff").html('<span class="material-icons" style="width: 100%;">videocam_off</span>');
            $("#ScreenShareOnOf").html('<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present</div>');
        }
    }

    var iceConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    async function setConnection(connid) {
        var connection = new RTCPeerConnection(iceConfiguration);

        connection.onnegotiationneeded = async function () {
            await setOffer(connid);
        };

        connection.onicecandidate = function (event) {
            if (event.candidate) {
                serverProcess(JSON.stringify({ icecandidate: event.candidate }), connid);
            }
        };

        connection.ontrack = function (event) {
            if (!remote_vid_stream[connid]) {
                remote_vid_stream[connid] = new MediaStream();
            }

            if (!remote_aud_stream[connid]) {
                remote_aud_stream[connid] = new MediaStream();
            }

            if (event.track.kind === "video") {
                remote_vid_stream[connid].getVideoTracks().forEach(t => remote_vid_stream[connid].removeTrack(t));
                remote_vid_stream[connid].addTrack(event.track);
                var remoteVideoPlayer = document.getElementById("v_" + connid);
                remoteVideoPlayer.srcObject = null;
                remoteVideoPlayer.srcObject = remote_vid_stream[connid];
                remoteVideoPlayer.load();
            } else if (event.track.kind === "audio") {
                remote_aud_stream[connid].getAudioTracks().forEach(t => remote_aud_stream[connid].removeTrack(t));
                remote_aud_stream[connid].addTrack(event.track);
                var remoteAudioPlayer = document.getElementById("a_" + connid);
                remoteAudioPlayer.srcObject = null;
                remoteAudioPlayer.srcObject = remote_aud_stream[connid];
                remoteAudioPlayer.load();
            }
        };

        peers_connection_ids[connid] = connid;
        peers_connection[connid] = connection;

        if (video_st === video_states.Camara || video_st === video_states.ScreenShare) {
            if (videoCamTrack) {
                updateMediaSenders(videoCamTrack, rtp_vid_senders);
            }
        }

        return connection;
    }

    async function setOffer(connid) {
        var connection = peers_connection[connid];
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({ offer: connection.localDescription }), connid);
    }

    async function SDPProcess(message, from_connid) {
        message = JSON.parse(message);
        if (message.answer) {
            await peers_connection[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.offer) {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid);
            }
            await peers_connection[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await peers_connection[from_connid].createAnswer();
            await peers_connection[from_connid].setLocalDescription(answer);
            serverProcess(JSON.stringify({ answer: answer }), from_connid);
        } else if (message.icecandidate) {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid);
            }
            try {
                await peers_connection[from_connid].addIceCandidate(message.icecandidate);
            } catch (e) {
                console.log(e);
            }
        }
    }

    async function closeConnection(connid) {
        peers_connection_ids[connid] = null;
        if (peers_connection[connid]) {
            peers_connection[connid].close();
            peers_connection[connid] = null;
        }
        if (remote_aud_stream[connid]) {
            remote_aud_stream[connid].getTracks().forEach(t => {
                if (t.stop) t.stop();
            });
            remote_aud_stream[connid] = null;
        }
        if (remote_vid_stream[connid]) {
            remote_vid_stream[connid].getTracks().forEach(t => {
                if (t.stop) t.stop();
            });
            remote_vid_stream[connid] = null;
        }
    }

    return {
        setNewConnection: async function (connid) {
            await setConnection(connid);
        },
        init: async function (SDP_function, my_connid) {
            await _init(SDP_function, my_connid);
        },
        processClientFunc: async function (data, from_connid) {
            await SDPProcess(data, from_connid);
        },
        closeConnectionCall: async function (connid) {
            await closeConnection(connid);
        }
    };
})();

var MyApp = (function () {
    var socket = null;
    var user_id = "";
    var meeting_id = "";

    function init(uid, mid) {
        user_id = uid;
        meeting_id = mid;
        $("#meetingContainer").show();
        $("#me h2").text(user_id + "(Me)");
        document.title = user_id;
        event_process_for_signaling_server();
    }

    function event_process_for_signaling_server() {
        socket = io.connect();

        var SDP_function = function (data, to_connid) {
            socket.emit("SDPProcess", { message: data, to_connid: to_connid });
        };

        socket.on("connect", () => {
            if (socket.connected) {
                AppProcess.init(SDP_function, socket.id);

                if (user_id !== "" && meeting_id !== "") {
                    socket.emit("userconnect", {
                        displayName: user_id,
                        meetingid: meeting_id
                    });
                }
            }
        });

        socket.on("inform_other_about_disconnected_user", function (data) {
            $("#" + data.connId).remove();
            AppProcess.closeConnectionCall(data.connId);
        });

        socket.on("inform_others_about_me", function (data) {
            addUser(data.other_user_id, data.connId);
            AppProcess.setNewConnection(data.connId);
        });

        socket.on("inform_me_about_other_user", function (other_users) {
            if (other_users) {
                for (var i = 0; i < other_users.length; i++) {
                    addUser(other_users[i].user_id, other_users[i].connectionId);
                    AppProcess.setNewConnection(other_users[i].connectionId);
                }
            }
        });

        socket.on("SDPProcess", async function (data) {
            await AppProcess.processClientFunc(data.message, data.from_connid);
        });

        socket.on("micCameraControl", function (data) {
            // Handle changes in mic and camera state from other users
            if (data.micOn) {
                // Implement code to unmute audio for this user
            } else {
                // Implement code to mute audio for this user
            }

            if (data.camOn) {
                // Implement code to start video for this user
            } else {
                // Implement code to stop video for this user
            }
        });
    }

    function addUser(other_user_id, connId) {
        var newDivId = $("#otherTemplate").clone();
        newDivId = newDivId.attr("id", connId).addClass("other");
        newDivId.find("h2").text(other_user_id);
        newDivId.find("video").attr("id", "v_" + connId);
        newDivId.find("audio").attr("id", "a_" + connId);
        newDivId.show();
        $("#divUsers").append(newDivId);
    }

    return {
        _init: function (uid, mid) {
            init(uid, mid);
        }
    };
})();


const io = require('socket.io')(server); // Assuming server is your HTTP server

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('userconnect', (data) => {
        console.log('User connected:', data);
        // Notify other users
        socket.broadcast.emit('inform_others_about_me', {
            other_user_id: data.displayName,
            connId: socket.id
        });
    });

    socket.on('micCameraControl', (data) => {
        console.log('Microphone/Camera control:', data);
        // Broadcast control changes to other users
        socket.broadcast.emit('micCameraControl', {
            micOn: data.micOn,
            camOn: data.camOn,
            connId: socket.id
        });
    });

    socket.on('SDPProcess', (data) => {
        socket.broadcast.emit('SDPProcess', {
            message: data.message,
            from_connid: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        socket.broadcast.emit('inform_other_about_disconnected_user', {
            connId: socket.id
        });
    });
});
