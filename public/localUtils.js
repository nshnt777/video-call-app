const localVid = document.getElementById('local-video');
let myStream;

function addVideoStream(video, stream){
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', ()=>{
        video.play();
    });
}

async function startCam(){
    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        addVideoStream(localVid, myStream);
    } catch (error) {
        console.log("Error accessing user media: "+error);
    }
}

async function getAudioDevices(){
    const audioSelector = document.getElementById("audio-devices");
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const allAudioDevices = devices.filter((device)=>{
        return device.kind === 'audioinput';
    });
    allAudioDevices.forEach((device)=>{
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.innerHTML = device.label;
        audioSelector.appendChild(option);
    });
}

const toggleVideo = document.getElementById("toggle-video");
toggleVideo.addEventListener('click', async ()=>{
    const videoTrack = myStream.getVideoTracks()[0];

    if(videoTrack){
        videoTrack.enabled = !videoTrack.enabled;

        if (videoTrack.enabled === false) {
            videoTrack.stop();
        } else if(videoTrack.enabled === true){
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                myStream.removeTrack(videoTrack);
                myStream.addTrack(newStream.getVideoTracks()[0]);
            } catch (error) {
                console.log("Error accessing user camera: "+error);
            }
        }
        addVideoStream(localVid, myStream);
    }
});

const toggleAudio = document.getElementById("toggle-audio");
toggleAudio.addEventListener('click', ()=>{
    const audioTrack = myStream.getAudioTracks()[0];
    if(audioTrack){
        audioTrack.enabled = !audioTrack.enabled;
    }
});

async function switchAudio(selectedDevice){
    const audioTrack = myStream.getAudioTracks()[0];

    if(audioTrack){
        audioTrack.stop();

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: {exact: selectedDevice},
                }
            });
        
            myStream.removeTrack(audioTrack);
            myStream.addTrack(newStream.getAudioTracks()[0]);
        
            addVideoStream(localVid, myStream);
        } catch (error) {
            console.log("Error accessing user microphone: "+error);
        }
    }
}

const switchAudioButton = document.getElementById("switch-audio");
switchAudioButton.addEventListener('click', ()=>{
    const audioDevice = document.getElementById("audio-devices");
    const selectedDevice = audioDevice.value;

    if(selectedDevice !== "none"){
        switchAudio(selectedDevice);
    }
});

window.addEventListener('load', async ()=>{
    startCam();
    getAudioDevices();
});

export {myStream, addVideoStream};