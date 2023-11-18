import { myStream, addVideoStream } from './localUtils.js';
const socket = io('/');

let peer = null;

async function addLocalTracks(){
    console.log("Loading tracks onto connection");
    console.log(myStream);
    myStream.getTracks().forEach((track) =>{
        peer.addTrack(track, myStream);
    });
}

let iceCandidates = [];
var fromID = '';
var receiverID = '';

async function getUSers(){
    try {
        const response = await fetch('/users', {method: 'GET'});
        const jsonResponse = await response.json();
    
        console.log(jsonResponse);

        const callButton = document.getElementById("make-call");

        for (const key in jsonResponse) {
            if (!jsonResponse.hasOwnProperty(key)) {
                continue;
            }
            if (jsonResponse[key] !== fromID) {
                callButton.innerHTML = `Join Call with ${key}`;

                const status = document.getElementById('status');
                status.innerText = ``;

                
                peer = new RTCPeerConnection({
                    iceServers: [
                        {urls: 'stun:stun.l.google.com'},
                        {urls: 'stun:stun.services.mozilla.com'},
                        {urls: 'stun:stun.stunprotocol.org'}
                    ]
                });
                peer.ontrack = handleTrackChange;
                peer.onicecandidate = handleICECandidates;
                peer.oniceconnectionstatechange = handleICEStateChange;

                receiverID = jsonResponse[key];
                callButton.addEventListener('click', ()=>{
                    createCall(jsonResponse[key], key)
                });
                break;
            } else if(jsonResponse[key] === fromID){
                const status = document.getElementById('status');
                status.innerText = `No other users`;
            }
        }
    } catch (error) {
        console.log(error);
    }
}

socket.on("joined", (userNO, id)=>{
    const ID = document.getElementById('myID');
    const user = document.querySelector('h2');
    user.innerHTML = userNO;
    ID.innerHTML = id;
    fromID = id;
    getUSers();
});

socket.on('other-user-joined', (remoteID)=>{
    receiverID = remoteID;
    console.log("Other user joined: "+remoteID);
    getUSers();
});

async function createCall(toID, toUser){
    const status = document.getElementById('status');
    status.innerText = `Calling ${toUser}, ID: ${toID}`;

    if (areLocalTracksAdded(peer, myStream)) {
        const senders = peer.getSenders();

        myStream.getTracks().forEach((track)=>{
            const sender = senders.find(s => s.track === track);
            peer.removeTrack(sender);
        });
    }
    await addLocalTracks();
    const LocalSDP = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(LocalSDP));
    
    socket.emit('outgoing-call', fromID, LocalSDP, toID);
}

socket.on('incoming-call', async (from, RemoteSDP, to) => {
    const status = document.getElementById('status');
    status.innerText = `Incoming call from ${from}`;
    console.log(`Calling ${to}`);

    const accept = document.createElement('button');
    accept.innerHTML = "Accept call?"
    status.insertAdjacentElement("afterend", accept);
    accept.onclick = async()=>{
        await peer.setRemoteDescription(new RTCSessionDescription(RemoteSDP));

        await addLocalTracks();
        const answerSDP = await peer.createAnswer();
        await peer.setLocalDescription(new RTCSessionDescription(answerSDP));
        
        socket.emit('call-accepted', to, answerSDP, from);
        status.innerText = `Call from ${from} accepted`;
        accept.remove();
    }
});

socket.on('incoming-answer', async (from, answerSDP, to)=>{
    const status = document.getElementById('status');
    status.innerText = `Call accepted by ${from}`;
    await peer.setRemoteDescription(new RTCSessionDescription(answerSDP));

    console.log(`Connection established....`);
});

const remoteVid = document.getElementById('remote-video');

function handleTrackChange(event){
    console.log("on track event triggered");
    console.log("My stream: ",myStream);
    const incomingStream = event.streams[0];
    
    if(incomingStream){
        console.log("Remote stream: ",incomingStream);
        addVideoStream(remoteVid, incomingStream);
    }
}

function handleICECandidates(event){
    console.log("ice candidates exchanged");
    const candidate = event.candidate;
    if(candidate){
        iceCandidates.push(candidate);
        socket.emit('ice-candidate', candidate);
    }
}

function handleICEStateChange(){
    if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'closed') {
        console.log("****STATE CHANGED****");
        if(remoteVid.srcObject){
            const remoteStream = remoteVid.srcObject;
            remoteStream.getTracks().forEach((track)=>{
                track.stop();
            });
        }
    }
};

socket.on('ice-candidate', (candidate) => {
    peer.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('user-disconnected', (leavingID)=>{
    console.log("BYEBYE");
    console.log(peer.iceConnectionState);
    const status = document.getElementById('status');
    status.innerText = `${leavingID} disconnected`;
    const callButton = document.getElementById("make-call");
    callButton.innerHTML = "Join Call";
    peer.close();
});


function areLocalTracksAdded(peerConnection, localStream) {
    const senders = peerConnection.getSenders();

    for (const sender of senders) {
      if (localStream.getTracks().includes(sender.track)) {
        return true;
      }
    }
  
    return false;
}