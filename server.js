const { Server } = require("socket.io");
const { uuid } = require('uuidv4');
const express = require('express');
const http = require('http');


const app = express();
app.use(express.static('public'));

const httpServer = http.createServer(app);


const generateConcert = () => {
    const newID = (uuid()).split('-');
    return {
        id : newID[0],
        pass : newID[1]
    }
}

const concertPassList = {}

const io = new Server(httpServer);


io.on("connection", socket => {
    console.log(`connect ${socket.id}`);
    socket.emit("message", "Boom")
    socket.on('connectID', (id) => {
        socket.connID = id;
    });

    socket.on('createNewConcert', () => {
        const concertDetails = generateConcert();
        concertPassList[concertDetails.id]= {pass : concertDetails.pass, owner : socket};
        socket.join(concertDetails.id);
        socket.emit("updateCount", 0)
        socket.emit('passcode', concertDetails)
    });

    socket.on('joinConcert', (concertID) => {
        console.log(concertID)
        if(concertPassList[concertID] != undefined){
            concertPassList[concertID].owner.emit("callTo", socket.connID);
            socket.join(concertID);
            io.to(concertID).emit("updateCount", io.sockets.adapter.rooms.get(concertID).size-1)
        }
        
        socket.emit("error", "Sorry No Concert Found !!")
    });
    socket.on("endTheConcert", (concertID) => {
        if(concertPassList[concertID] && concertPassList[concertID].owner == socket){
            io.in(concertID).socketsLeave(concertID); 
            console.log("Room Closed")
        }
    });

    socket.on("sendMessage", (curConcertID, message) => {
        if(io.sockets.adapter.rooms.get(curConcertID)?.has(socket.id)){
            socket.broadcast.to(curConcertID).emit("newMessage", message);
        }
    })
    socket.on('disconnecting', () => {
        for(let eachRoomID of socket.rooms){
            if(concertPassList[eachRoomID]?.owner == socket){
                io.to(eachRoomID).emit("concertEnd");
            }else{
                io.to(eachRoomID).emit("updateCount", io.sockets.adapter.rooms.get(eachRoomID).size-2)
            }
        }
    });
    socket.on("disconnect", (reason) => {
      console.log(`disconnect ${socket.id} due to ${reason}`);
    });
 });
 


httpServer.listen(4444, () => {
    console.log("Server Started At 4444")
});
