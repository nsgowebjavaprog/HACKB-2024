//import * as $ from 'jquery';
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
    }
    var video_st = video_states.None;
    var videoCamTrack;
    var rtp_vid_senders = [];

    async function _init(SDP_function, my_connid) {
        serverProcess = SDP_function;
        my_connection_id = my_connid;
        eventProcess();
        local_div = document.getElementById("localVideoPlayer");

    }

    // Mice functions 
    function eventProcess() {
        $("#miceMuteUnmute").on("click", async function () {
            if (!audio) {
                await loadAudio();
            }
            if (!audio) {
                alert("Audio permission on has not granted");
                return;
            }
            if (isAudioMute) {
                audio.enabled = true;
                $(this).html("<span class='material-icons' style='width:100%;'>mic</span>");
                updateMediaSenders(audio, rtp_aud_sender);
            } else {
                audio.enabled = false;
                $(this).html("<span class='material-icons' style='width:100%;'>mic_off</span>");
                removeMediaSenders(rtp_aud_sender);
            }
            isAudioMute = !isAudioMute;
        });

        //Video Func's
        $("#videoCamOnOff").on("click", async function () {
            if (video_st == video_states.Camara) {
                await videoProcess(video_states.None)
            } else {
                await videoProcess(video_states.Camara)
            }
        })
        //  ScreenShareOnOf
        $("#ScreenShareOnOf").on("click", async function () {
            if (video_st == video_states.ScreenShare) {
                await videoProcess(video_states.None)
            } else {
                await videoProcess(video_states.ScreenShare)
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
        if (
            connection &&
            (connection.connectionState == "new" ||
                connection.connectionState == "connectiong" ||
                connection.connectionState == "connected")
        ) {
            return true;
        } else {
            return false;
        }
    }
    async function updateMediaSenders(track, rtp_senders) {
        for (var con_id in peers_connection_ids) {
            if (connection_status(peers_connection[con_id])) {
                if (rtp_senders[con_id] && rtp_senders[con_id].track) {
                    rtp_senders[con_id].replaceTrack(track)
                } else {
                    rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
                }
            }
        }
    }

    function removeMediaSenders(rtp_senders) {
        for (var con_id in peers_connection_ids) {
            if (rtp_senders[con_id] && connection_status(peers_connection[con_id]
            )) {
                peers_connection[con_id].removeTrack(rtpSenders[con_id]);
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
        if (newVideoState == video_states.None) {
            $("#videoCamOnOff").html(
                "<span class='material-icons' style='width:100%;'>videocam_off</span>"
            );

            $("#ScreenShareOnOf").html('<span class="material-icons">present_to_all</span><div>Present Now</div>');

            video_st = newVideoState;

            removeVideoStream(rtp_vid_senders);
            return;
        }

        if (newVideoState == video_states.Camara) {
            $("#videoCamOnOff").html(
                "<span class='material-icons'>videocam_off</span>"
            );
        }
        try {
            var vstream = null;
            if (newVideoState == video_states.Camara) {
                vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                });
            } else if (newVideoState == video_states.ScreenShare) {
                vstream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                });

                vstream.oninactive = (e) =>{
                    removeVideoStream(rtp_vid_senders);
                    $("#ScreenShareOnOf").html('<span class="material-icons"> present_to_all</span><div>Present Now</div>');

                }

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

        if(newVideoState == video_states.Camara){
            $("#videoCamOnOff").html('<span class="material-icons" style="width: 100%;">videocam</span>');
            $("#ScreenShareOnOf").html('<span class="material-icons"> present_to_all</span><div>Present Now</div>');

        }else if(newVideoState == video_states.ScreenShare){
            $("#videoCamOnOff").html('<span class="material-icons" style="width: 100%;">videocam_off</span>');
           

            $("#ScreenShareOnOf").html('<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present</div>');
        } 


    }
    var iceConfiguration = {
        iceServers: [
            {
                urls: "stum:stum.l.google.com:19302",
            },
            {
                urls: "stun:stun1.l.google.com:19302"
            },
        ]
    }
    async function setConnection(connid) {
        var connection = new RTCPeerConnection(iceConfiguration);
        //webRTC connection

        connection.onnegotiationneeded = async function (event) {
            await setOffer(connid);
        };
        connection.onicecandidate = function (event) {
            if (event.candidate) {
                serverProcess(
                    JSON.stringify({ icecandidate: event.candidate }),
                    connid);
            }
        };
        connection.ontrack = function (event) {
            if (!remote_vid_stream[connid]) {
                remote_vid_stream[connid] = new MediaStream();
            }

            if (!remote_aud_stream[connid]) {
                remote_aud_stream[connid] = new MediaStream();
            }

            if (event.track.kind == "video") {

                remote_vid_stream[connid]
                    .getVideoTracks()
                    .forEach((t) => remote_vid_stream[connid].removeTrack(t));
                remote_vid_stream[connid].addTrack(event.track);
                var remoteVideoPlayer = document.getElementById("v_" + connid)
                remoteVideoPlayer.srcObject = null;
                remoteVideoPlayer.srcObject = remote_vid_stream[connid];
                remoteVideoPlayer.load();

            } else if (event.track.kind == "audio") {

                remote_aud_stream[connid]
                    .getAudioTracks()
                    .forEach((t) => remote_aud_stream[connid].removeTrack(t));
                remote_aud_stream[connid].addTrack(event.track);
                var remoteAudioPlayer = document.getElementById("a_" + connid)
                remoteAudioPlayer.srcObject = null;
                remoteAudioPlayer.srcObject = remote_aud_stream[connid];
                remoteAudioPlayer.load();

            }
        };
        peers_connection_ids[connid] = connid;
        peers_connection[connid] = connection;

        if (
            video_st == video_states.Camara ||
            video_st == video_states.ScreenShare
        ) {
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
        serverProcess(
            JSON.stringify({
                offer: connection.LocalDescription,
            }),
            connid
        );
    }

    async function SDPProcess(message, from_connid) {
        message = JSON.parse(message);
        if (message.answer) {
            await peers_connection[from_connid].setRemoteDescription(new
                RTCSessionDescription(message.answer))

        } else if (message.offer) {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid);
            }
            await peers_connection[from_connid].setRemoteDescription(new
                RTCSessionDescription(message.offer))
            var answer = await peers_connection[from_connid].createAnswer();
            await peers_connection[from_connid].setLocalDescription(answer);
            serverProcess(
                JSON.stringify({
                    answer: answer,
                }),
                from_connid
            );
        } else if (message.icecandidate) {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid);
            }
            try {
                await peers_connection[from_connid].addIceCandidate(message.
                    iceConfiguration);
            } catch (e) {
                console.log(e);
            }
        }
    }

    async function closeConnection(connid){
        peers_connection_ids[connid] = null;
        if(peers_connection[connid]){
            peers_connection[connid].clone();
            peers_connection[connid] = null;
        }
        if(remote_aud_stream[connid]){
            remote_aud_stream[connid].getTracks().forEach((t) =>{
                if(t.stop) t.stop();
            })
            remote_aud_stream[connid] = null;
        }
        if(remote_vid_stream[connid]){
            remote_vid_stream[connid].getTracks().forEach((t) =>{
                if(t.stop) t.stop();
            })
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
        },
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
        eventHandeling();
    }
    // var socket = null;
    function event_process_for_signaling_server() {
        socket = io.connect()

        var SDP_function = function (data, to_connid) {
            socket.emit("SDPProcess", {
                message: data,
                to_connid: to_connid
            });
        };

        socket.on("connect", () => {
            if (socket.connected) {

                AppProcess.init(SDP_function, socket.id)

                if (user_id != "" && meeting_id != "") {
                    socket.emit("userconnect", {
                        displayName: user_id,
                        meetingid: meeting_id
                    });
                }
            }
        });

        socket.on("inform_other_about_disconnected_user", function(data){
            $("#" +data.connId).remove();
            $(".participant-count").text(data.uNumber);
            $("#participant_" +data.connId+"").remove();
            AppProcess.closeConnectionCall(data.connId);
        })


        socket.on("inform_others_about_me", function (data) {
            addUser(data.other_user_id, data.connId, data.userNumber);
            AppProcess.setNewConnection(data.connId);
        });
// file sharing-Start

socket.on("showFileMessage", function(data){
    var time = new Date();
    var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
    })
    var attachFileAreaForOther = document.querySelector(".show-attach-file");

    attachFileAreaForOther.innerHTML +=  "<div class='left-align' style='display:flex;align-items:center;'><img src='public/assets/images/other.jpg' style='height:40px;width:40px;' class='caller-image circle'><div style='font-weight:600; margin:0 5px;'>" +data.username+"</div>:<div><a style='color:#007bff;' href='"+data.filePath+"' download>"+data.fileName+"</a></div></div><br/>";
})


// file sharing-End
        socket.on("inform_me_about_other_user", function (other_users) {
           var userNumber = other_users.length; 
           var userNumber = userNumber + 1;
            if (other_users) {
                for (var i = 0; i < other_users.length; i++) {
                    addUser(other_users[i].user_id, other_users[i].connectionId, userNumb);
                    AppProcess.setNewConnection(other_users[i].connectionId);
                }
            }


        });

        socket.on("SDPProcess", async function (data) {
            await AppProcess.processClientFunc(data.message, data.from_connid);
        });
    // Start Chat-2

    socket.on("showChatMessage", function(data){
        var time = new Date();
        var lTime = time.toLocaleString("en-US", {
            hour:"numeric",
            minute:"numeric",
            hour12:true
        })
        var div =$("<div>").html("<span class='font-weight-bold mr-3'style='color:black'>"+data.from+"</span>"+lTime+"</br>"+data.message);
        $("#messages").append(div);
        
    })

    //
    }
    // Start Chat-1
    function eventHandeling(){
        $("#btnsend").on("click", function() {
            var msgData = $("#msgbox").val();
            socket.emit("sendMessage", msgData);
// i see my chat
            var time = new Date();
            var lTime = time.toLocaleString("en-US", {
                hour:"numeric",
                minute:"numeric",
                hour12:true
            })
            var div =$("<div>").html("<span class='font-weight-bold mr-3'style='color:black'>"+user_id+"</span>"+lTime+"</br>"+msgData);
            $("#messages").append(div);
            $("#msgbox").val("");
        });

        var url = window.location.href;
        $(".meeting_url").text(url);
    }
    // socket.on("showChatMessage", function(data){
    //     var time = new Date();
    //     var lTime = time.toLocaleString("en-US", {
    //         hour:"numeric",
    //         minute:"numeric",
    //         hour12:true
    //     })
    //     var div =$("<div>").html("<span class='font-weight-bold mr-3'style='color:black'>"+data.from+"</span>"+lTime+"</br>"+data.message);
    //     $("#messages").append(div);
        
    // })


    // End Chat-Final

    function addUser(other_user_id, connId, userNum) {
        var newDivId = $("#otherTemplate").clone();
        newDivId = newDivId.attr("id", connId).addClass("other");
        newDivId.find("h2").text(other_user_id);
        newDivId.find("video").attr("id", "v_" + connId);
        newDivId.find("audio").attr("id", "a_" + connId);
        newDivId.show();
        $("#divUsers").append(newDivId);

//////////////////////////////--more lines

        $(".in-call-wrap-up").append('<div class="in-call-wrap d-flex justify-content-between align-items-center mb-3 id="participant_'+connId+'"> <div class="participant-img-name-wrap display-center cursor-pointer"> <div class="participant-img"> <img src="public/Assets/images/other.jpg" alt="" class="border border-secondary" style="height: 40px; width: 40px;border-radius:50%;"> </div> <div class="participant-name ml-2"> '+other_user_id+' </div> </div> <div class="participant-img-action-wrap display-center"> <div class="participant-action-dot display-center mr-2 cursor-pointer"> <span class="material-icons"> more_vert </span> </div> <div class="participant-action-pin display-center mr-2 cursor-pointer"> <span class="material-icons"> push_pin </span> </div> </div></div>');
        $(".participant-count").text(userNum);
    }

    // participant Details- Start

    $(document).on("click", ".people-heading", function() {
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);
        $(this).addClass("active");
        $(".chat-heading").removeClass("active");
    });

    $(document).on("click", ".chat-heading", function() {
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);
        $(this).addClass("active");
        $(".people-heading").removeClass("active");
    });

    $(document).on("click", ".meeting-heading-cross", function() {
        $(".g-right-details-wrap").hide(300);   // 300 milli-seconds
    });

    $(document).on("click", ".top-left-participant-wrap", function() {
        $(".people-heading").addClass("active");
        $(".chat-heading").removeClass("active");
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);
    });

    $(document).on("click", ".top-left-chat-wrap", function() {
        $(".people-heading").removeClass("active");
        $(".chat-heading").addClass("active");
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);
    });

    // End Button

    $(document).on("click", ".end-call-wrap", function() {
        $(".top-box-show")
        .css({
            display:"block",
        }).html('<div class="top-box align-vertical-middle profile-dialogue-show"> <h1 class="mt-3" style="text-align:center; color:white;">Leave Meeting</h1><hr> <div class="call-leave-cancel-action d-flex just-content-center align-items-center w-100"> <a href="/action.html"><button class="call-leave-action btn btn-danger mr-5"> Leave</button></a> <button class="call-cancel-action btn btn-secondary">Cancel</button> </div> </div>');
    });

    $(document).mouseup(function(e){
        var container = new Array();
        container.push($(".top-box-show"));
        $.each(container, function(key, value){
            if(!$(value).is(e.target) && $(value).has(e.target).length == 0){
                $(value).empty();
            }
        });
    });

    $(document).mouseup(function(e){
        var container = new Array();
        container.push($(".g-details"));
        container.push($(".g-right-details-wrap"));
        $.each(container, function(key, value){
            if(!$(value).is(e.target) && $(value).has(e.target).length == 0){
                $(value).hide(300);
            }
        });
    });

$(document).on("click",".call-cancel-action", function(){
    $('.top-box-show').html('');
});

 // participant Details- End

//------------------------------*************************----------------------

// Meeting-Details-Start

// document.addEventListener("click", function(event) {
//     if (event.target.classList.contains("copy_info")) {
//         const tempInput = document.createElement("input");
//         document.body.appendChild(tempInput);
//         tempInput.value = document.querySelector(".meeting_url").textContent;
//         tempInput.select();
//         document.execCommand("copy");
//         tempInput.remove();
//         document.querySelector(".link-conf").style.display = "block";
//         setTimeout(function() {
//             document.querySelector(".link-conf").style.display = "none";
//         }, 1000);
//     }
// });

    $(document).on("click", ".copy_info", function(){
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val($(".meeting_url").text()).select();
        document.execCommand("copy");
        $temp.remove();
        $(".link-conf").show();
        setTimeout(function (){
            $(".link-conf").hide();
        }, 3000);
    });
// attachment-Start
    $(document).on("click", ".meeting-details-button", function(){
        $(".g-details").slideDown(300);
    });
    $(document).on("click", ".g-details-heading-attachment", function(){
       $(".g-details-heading-show").hide();
       $(".g-details-heading-show-attachment").show();
       $(this).addClass('active');
       $(".g-details-heading-detail").removeClass('active');
    });
    $(document).on("click", ".g-details-heading-detail", function(){
        $(".g-details-heading-show").show();
        $(".g-details-heading-show-attachment").hide();
        $(this).addClass('active');
        $(".g-details-heading-attachment").removeClass('active');
     });

// attachment-End

// Meeting-Details-End

//File Sharing-Start
var base_url = window.location.origin;

    $(document).on("change", ".custom-file-input", function(){
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });

        $(document).on("click", ".share-attach", function(e){    
        e.preventDefault();
        var att_img = $("#customFile").prop("files")[0];
        var formData = new FormData();
        formData.append("zipfile", att_img);
        formData.append("meeting_id", meeting_id);
        formData.append("username", user_id);
        console.log(formData);
        $.ajax({
            url:base_url+"/attachimg",
            type:"POST",
            data:formData,
            contentType:false,
            processData:false,
            success:function(response){
                console.log(response)
            },
            error:function(){
                console.log('error');
            },
        });

        var attachFileArea = document.querySelector(".show-attach-file");
        var attachFileName = $("#customFile").val().split("\\").pop();
        var attachFilePath = "public/attachment/"+meeting_id+"/"+attachFileName;
        attachFileArea.innerHTML += "<div class='left-align' style='display:flex;align-items:center;'><img src='public/assets/images/other.jpg' style='height:40px;width:40px;' class='caller-image circle'><div style='font-weight:600; margin:0 5px;'>" +user_id+"</div>:<div><a style='color:#007bff;' href='"+attachFilePath+"' download>"+attachFileName+"</a></div></div><br/>";
        $("label.custom-file-label").text("");
        socket.emit("fileTransferToOther", {
            username:user_id,
            meetingid: meeting_id,
            filePath:attachFilePath,
            fileName:attachFileName
        });

    });

// Recording-Start

    $(document).on("click", ".option-icon", function(){
        $(".recording-show").toggle(300);
    })

    $(document).on("click", ".start-record", function(){
        $(this).removeClass().addClass("stop-record btn-danger text-dark").text("stop Recording");
        startRecording();
    });

    $(document).on("click", ".stop-record", function(){
        $(this).removeClass().addClass("start-record btn-dark text-danger").text("Start Recording");
        mediaRecorder.stop();
    });

    var mediaRecorder;
    var chunks = [];

    //1
    async function captureScreen(mediaContraints = {
        video:true
    }){
        const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaContraints)
        return screenStream;
    }  
    //2
    async function captureAudio(mediaContraints = {
        video:false,
        audio:true
    }){
        const audioStream = await navigator.mediaDevices.getUserMedia(mediaContraints)
        return audioStream;
    }  

        async function startRecording(){
            const screenStream = await captureScreen();
            const audioStream = await captureAudio();
            const stream = new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()])
       
            mediaRecorder = new MediaRecorder(stream);       
            mediaRecorder.start();
            mediaRecorder.onstop = function(e){
                var clipName = prompt("Enter a name for your recording");
                stream.getTracks().forEach((track) => track.stop());
                const blob = new Blob(chunks, {
                    type: "video/webm",
                })
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = clipName + ".webm";
                document.body.appendChild(a);
                a.click();
                setTimeout(() =>{
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                },100)
            }
            mediaRecorder.ondataavailable = function(e){
                chunks.push(e.data);
            }
        }


// Recording-End

//microphone on and off for a specific participant 
// //-----------------------------------------------------------------Start
// app.js

// Function to toggle microphone on/off
function toggleMic() {
    // Get the current microphone state
    const isMicOn = document.querySelector('.participant-action-pin').classList.contains('mic-on');

    // Toggle the microphone state
    if (isMicOn) {
        // Turn off the microphone
        document.querySelector('.participant-action-pin').classList.remove('mic-on');
        document.querySelector('.participant-action-pin').classList.add('mic-off');
        // Call server to turn off microphone for this participant
        fetch('/toggleMic', { method: 'POST', body: 'off' })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    } else {
        // Turn on the microphone
        document.querySelector('.participant-action-pin').classList.remove('mic-off');
        document.querySelector('.participant-action-pin').classList.add('mic-on');
        // Call server to turn on microphone for this participant
        fetch('/toggleMic', { method: 'POST', body: 'on' })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    }
}

// Add event listener to the pin icon
document.querySelector('.participant-action-pin').addEventListener('click', toggleMic);

// //----------------------------------------------------------------------------End
//File Sharing-End
    return {
        _init: function (uid, mid) {
            init(uid, mid);
        },
    };
})();