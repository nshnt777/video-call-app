import express from 'express';
import * as http from 'http';
import {Server as SocketIO} from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidV4} from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    }
});

app.use(express.static(__dirname + '\\public'));

const users = {};
let i = 1;

io.on('connection', (socket)=>{
    users[`user${i}`] = socket.id;
    console.log('User connected: '+users[`user${i}`]);

    socket.emit("joined", `User ${i}`, socket.id);
    i = i+1;
    console.log(users);
    
    socket.broadcast.emit('other-user-joined', socket.id);

    socket.on('outgoing-call', (from, SDP, to)=>{
        console.log("Call offered from: "+from);
        socket.broadcast.emit('incoming-call', from, SDP, to);
    });

    socket.on('call-accepted', (from, answerSDP, to)=>{
        console.log(`Call accepted by ${from}`);
        socket.to(to).emit('incoming-answer', from, answerSDP, to);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    socket.on('disconnect', ()=>{
        const leavingID = socket.id;
        console.log(`${leavingID} disconnecting`);
        for (const key in users) {
            if (!users.hasOwnProperty(key)) {
                continue;
            }
            if(leavingID === users[key]){
                delete users[key];
                i--;
            };
        }
        socket.broadcast.emit('user-disconnected', leavingID)
        console.log(users);
    });
});

app.get('/users', (req, res) => {
    return res.json(users);
});

app.get('/', function(req, res){
    const roomID = uuidV4();
    res.redirect(`/${roomID}`);
});

app.get('/:room', (req,res)=>{
    console.log(req.params.room);
    res.sendFile(__dirname + '\\views\\index.html');
});

server.listen(port, ()=>{
    console.log('Listening at port '+port);
});
