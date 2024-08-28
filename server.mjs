import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';
import fs from 'fs';
import fileUpload from 'express-fileupload';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = app.listen(3000, function () {
    console.log("Listening on port 3000")
});

// File-sharing-Start

// const fs = require('fs');
//const fileUpload = require("express-fileupload");

// File-sharing-End


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
        });
        // participant details-Start

        var userCount = userConnections.length;
        console.log(userCount);

        // participant details-End

        other_users.forEach((v) => {
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName,
                connId: socket.id,
                // participant details-Start
                userNumber: userCount
                // participant details-End

            })
        })
        socket.emit("inform_me_about_other_user", other_users);

    });
    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        })


    })
    // chat-Start

    socket.on("sendMessage", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id);
        if (mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showChatMessage", {
                    from: from,
                    message: msg
                });
            })
        }
    })

    //chat-End


    ////////-------------file sharing Start
    socket.on("fileTransferToOther", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id);
        if (mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showFileMessage", {
                    username: msg.username,
                    meetingid: msg.meetingid,
                    filePath: msg.filePath,
                    fileName: msg.fileName,
                });
            });
        }
    });

    socket.on("fileTransferToOther", function (msg) {
        console.log(msg);
        var userO
    })

    ////////-----------------file sharing End



    // Screen Sharing-start

    socket.on("disconnect", function () {
        console.log("Disconnected");
        var disUser = userConnections.find((p) => p.connectionId == socket.id);

        if (disUser) {
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter(
                (p) => p.connectionId != socket.id
            );
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                // participant details-Start
                var userNumberAfUserLeave = userConnections.length;
                // participant details-End                
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                    // participant details-Start
                    uNumber: userNumberAfUserLeave
                    // participant details-End
                });
            });
        }

    });
});
// Screen Sharing-End

// File-sharing-Start

app.use(fileUpload());

app.post("/attaching", function (req, res) {
    var data = req.body;
    var imageFile = req.files.zipfile;
    console.log(imageFile);
    var dir = "public/attachment/" + data.meeting_id + "/";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    imageFile.mv("public/attachment/" + data.meeting_id + "/" + imageFile.name, function (error) {
        if (error) {
            console.log("couldn't upload the image file, error: ", error);
        } else {
            console.log("Image file successfully uploaded");
        }
    })
})