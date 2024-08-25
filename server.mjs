import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = app.listen(3000, function(){
    console.log("Listening on port 3000")
});

const io = new Server(server, {
    allowEIO3: true,
});

app.use(express.static(path.join(__dirname, "")));

var userConnections = [];

io.on("connection", (socket) => {
    console.log("socket id is ", socket.id);

    socket.on("userconnect", (data) => {
        console.log("userconnect", data.displayName, data.meetingid);

        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid
        );

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
            micOn: true, // Default state for mic
            camOn: true  // Default state for camera
        });

        other_users.forEach((v) => {
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName,
                connId: socket.id,
                micOn: true,
                camOn: true
            });
        });
        socket.emit("inform_me_about_other_user", other_users);
    });

    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        });
    });

    socket.on("micCameraControl", (data) => {
        console.log("micCameraControl", data);
        // Update the user's mic/camera state in the server
        var user = userConnections.find(p => p.connectionId == socket.id);
        if (user) {
            user.micOn = data.micOn;
            user.camOn = data.camOn;
        }

        // Notify other users in the same meeting
        var other_users = userConnections.filter(p => p.meeting_id == user.meeting_id && p.connectionId != socket.id);
        other_users.forEach(v => {
            socket.to(v.connectionId).emit("userMicCameraUpdate", {
                connId: socket.id,
                micOn: data.micOn,
                camOn: data.camOn
            });
        });
    });

    socket.on("disconnect", function() {
        console.log("Disconnected");
        var disUser = userConnections.find((p) => p.connectionId == socket.id);
    
        if (disUser) {
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter(
                (p) => p.connectionId != socket.id
            );
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                });
            });
        }
    });
});
