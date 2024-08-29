import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';
import fs from 'fs';
import fileUpload from 'express-fileupload';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = app.listen(3000, function(){
    console.log("Listening on port 3000")
});

const io = new Server(server,{
    allowEIO3:true,
});

app.use(express.static(path.join(__dirname, "")));
app.use(fileUpload());

var userConnections = [];

io.on("connection", (socket)=>{
    console.log("socket id is ", socket.id);

    socket.on("userconnect", (data) =>{
        console.log("userconnect", data.displayName, data.meetingid);

        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid
        );

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
        });

        var userCount = userConnections.length;
        console.log(userCount);

        other_users.forEach((v) =>{
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName,
                connId: socket.id,
                userNumber: userCount
            })
        })
        socket.emit("inform_me_about_other_user", other_users);
    });

    socket.on("SDPProcess", (data)=>{
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        })
    })

    socket.on("sendMessage", (msg) =>{
        console.log(msg);
        var mUser = userConnections.find((p)=>p.connectionId == socket.id);
        if(mUser){
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p)=>p.meeting_id == meetingid);
            list.forEach((v)=>{
                socket.to(v.connectionId).emit("showChatMessage",{
                    from : from,
                    message : msg
                });
            })
        }
    })

    socket.on("fileTransferToOther", (msg) =>{
        console.log(msg);
        var mUser = userConnections.find((p)=>p.connectionId == socket.id);
        if(mUser){
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p)=>p.meeting_id == meetingid);
            list.forEach((v)=>{
                socket.to(v.connectionId).emit("showFileMessage",{
                    username: msg.username,
                    meetingid: msg.meetingid,
                    filePath: msg.filePath,
                    fileName: msg.fileName,
                });
            });
        }
    });

    socket.on("disconnect", function() {
        console.log("Disconnected");
        var disUser = userConnections.find((p) =>p.connectionId == socket.id);
    
        if(disUser){
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter(
                (p) => p.connectionId != socket.id
            );
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) =>{
                var userNumberAfUserLeave = userConnections.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                    uNumber: userNumberAfUserLeave
                });
            });
        }
    });
});

app.post("/attaching", function(req, res){
    var data = req.body;
    var imageFile = req.files.zipfile;
    console.log(imageFile);
    var dir = "public/attachment/" +data.meeting_id+"/";
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    imageFile.mv("public/attachment/"+data.meeting_id+"/"+imageFile.name, function(error){
        if(error){
            console.log("couldn't upload the image file, error: ", error);
        }else{
            console.log("Image file successfully uploaded");
        }
    })
})

app.use(express.json());

app.post('/toggleMic', (req, res) => {
    const participantId = req.body.participantId;
    const state = req.body.state;

    let micStates = {};
    if (state === 'on') {
        micStates[participantId] = true;
    } else if (state === 'off') {
        micStates[participantId] = false;
    }

    res.json({ message: `Microphone ${state} for participant ${participantId}` });
});




// import express from 'express';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// import { Server } from 'socket.io';
// import fs from 'fs';
// import fileUpload from 'express-fileupload';

// const __dirname = dirname(fileURLToPath(import.meta.url));

// const app = express();
// const server = app.listen(3000, function(){
//     console.log("Listening on port 3000")
// });

// // File-sharing-Start

// // const fs = require('fs');
// //const fileUpload = require("express-fileupload");

// // File-sharing-End


// const io = new Server(server,{
//     allowEIO3:true,
// });

// app.use(express.static(path.join(__dirname, "")));

// var userConnections = [];

// io.on("connection", (socket)=>{
//     console.log("socket id is ", socket.id);
//     socket.on("userconnect", (data) =>{
//         console.log("userconnect", data.displayName, data.meetingid);

//         var other_users = userConnections.filter(
//             (p) => p.meeting_id == data.meetingid
//         );

//         userConnections.push({
//             connectionId: socket.id,
//             user_id: data.displayName,
//             meeting_id: data.meetingid,
//         });
//         // participant details-Start

//         var userCount = userConnections.length;
//         console.log(userCount);

//         // participant details-End

//         other_users.forEach((v) =>{
//             socket.to(v.connectionId).emit("inform_others_about_me", {
//                 other_user_id: data.displayName,
//                 connId: socket.id,
//              // participant details-Start
//                 userNumber: userCount
//              // participant details-End

//             })
//         })
//         socket.emit("inform_me_about_other_user", other_users);

//     });
//     socket.on("SDPProcess", (data)=>{
//         socket.to(data.to_connid).emit("SDPProcess", {
//             message: data.message,
//             from_connid: socket.id,
//         })


//     })
//     // chat-Start

//     socket.on("sendMessage", (msg) =>{
//         console.log(msg);
//         var mUser = userConnections.find((p)=>p.connectionId == socket.id);
//         if(mUser){
//             var meetingid = mUser.meeting_id;
//             var from = mUser.user_id;
//             var list = userConnections.filter((p)=>p.meeting_id == meetingid);
//             list.forEach((v)=>{
//                 socket.to(v.connectionId).emit("showChatMessage",{
//                     from : from,
//                     message : msg
//                 });
//             })
//         }
//     })

//     //chat-End


// ////////-------------file sharing Start
// socket.on("fileTransferToOther", (msg) =>{
//     console.log(msg);
//     var mUser = userConnections.find((p)=>p.connectionId == socket.id);
//     if(mUser){
//         var meetingid = mUser.meeting_id;
//         var from = mUser.user_id;
//         var list = userConnections.filter((p)=>p.meeting_id == meetingid);
//         list.forEach((v)=>{
//             socket.to(v.connectionId).emit("showFileMessage",{
//                 username: msg.username,
//                 meetingid: msg.meetingid,
//                 filePath: msg.filePath,
//                 fileName: msg.fileName,
//             });
//         });
//     }
// });

// socket.on("fileTransferToOther", function(msg){
//     console.log(msg);
//     var userObj = _userConnections.find((p) => p.connectionId == socket.id);
//     if (userObj) {
//         var meetingid = userObj.meeting_id;
//         var from = userObj.user_id;
        
//         var list = _userConnections.filter((p) => p.meeting_id == meetingid);
//         console.log(list);
        
//         list.forEach((v) => {
//             socket.to(v.connectionId).emit("showFileMessage", {
//                 from: from,
//                 username: msg.username,
//                 meetingid: msg.meetingid,
//                 FileePath: msg.FileePath,
//                 fileeName: msg.fileeName,
//                 time: getCurrDateTime(),
//             });
//         });
//     }
// });

// ////////-----------------file sharing End



//     // Screen Sharing-start

//     socket.on("disconnect", function() {
//         console.log("Disconnected");
//         var disUser = userConnections.find((p) =>p.connectionId == socket.id);
    
//         if(disUser){
//             var meetingid = disUser.meeting_id;
//             userConnections = userConnections.filter(
//                 (p) => p.connectionId != socket.id
//             );
//             var list = userConnections.filter((p) => p.meeting_id == meetingid);
//             list.forEach((v) =>{
//                 // participant details-Start
//                 var userNumberAfUserLeave = userConnections.length;
//                 // participant details-End                
//                 socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
//                     connId: socket.id,
//               // participant details-Start
//                 uNumber: userNumberAfUserLeave
//               // participant details-End
//                 });
//             });
//         }

//     });
// });
//  // Screen Sharing-End

// //  //--------------Start
// //  function getCurrDateTime() {
// //     let date_ob = new Date();
// //     let date = ("0" + date_ob.getDate()).slice(-2);
// //     let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
// //     let year = date_ob.getFullYear();
// //     let hours = date_ob.getHours();
// //     let minutes = date_ob.getMinutes();
// //     let seconds = date_ob.getSeconds();
// //     var dt =
// //         year +
// //         "-" +
// //         month +
// //         "-" +
// //         date +
// //         " " +
// //         hours +
// //         ":" +
// //         minutes +
// //         ":" +
// //         seconds;
// //     return dt;
// // }

// //  //--------------End

// // File-sharing-Start

// app.use(fileUpload());

// app.post("/attaching", function(req, res){
//     var data = req.body;
//     var imageFile = req.files.zipfile;
//     console.log(imageFile);
//     var dir = "public/attachment/" +data.meeting_id+"/";
//     if(!fs.existsSync(dir)){
//         fs.mkdirSync(dir);
//     }
//     imageFile.mv("public/attachment/"+data.meeting_id+"/"+imageFile.name, function(error){
//         if(error){
//             console.log("couldn't upload the image file, error: ", error);
//         }else{
//             console.log("Image file successfully uploaded");
//         }
//     })
// })

// // microphone on and off for a specific participant 
// //------------------------------------------Start
// // server.mjs

// // import express from 'express';
// // import { Server } from 'ws';

// // In-memory store for demonstration purposes
// let micStates = {};

// app.use(express.json());

// app.post('/toggleMic', (req, res) => {
//     const participantId = req.body.participantId;
//     const state = req.body.state;

//     if (state === 'on') {
//         micStates[participantId] = true;
//     } else if (state === 'off') {
//         micStates[participantId] = false;
//     }

//     res.json({ message: `Microphone ${state} for participant ${participantId}` });
// });

// server.on('connection', (ws) => {
//     ws.on('message', (message) => {
//         const data = JSON.parse(message);
//         if (data.type === 'toggleMic') {
//             const participantId = data.participantId;
//             const state = data.state;

//             if (state === 'on') {
//                 micStates[participantId] = true;
//             } else if (state === 'off') {
//                 micStates[participantId] = false;
//             }

//             // Broadcast the updated state to all connected clients
//             server.clients.forEach((client) => {
//                 if (client !== socket.io && client.readyState === Server.OPEN) {
//                     client.send(JSON.stringify({ type: 'micState', participantId, state }));
//                 }
//             });
//         }
//     });

// //     ws.on('close', () => {
// //         console.log('Client disconnected');
// //     });
// });

// // app.listen(3000, () => {
// //     console.log('Server is running on port 3000');
// // });
// //-------------------------------------------End