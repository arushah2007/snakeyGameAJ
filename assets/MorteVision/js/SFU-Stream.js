async function streamerInit() {
    try {
        firstInLine = document.getElementById("waitingList").firstElementChild.textContent;
    } catch {
        alert('You are not first in line. Please wait your turn!')
    }
    if (person == firstInLine) {
        startTimer();
        const stream = await captureScreen();
        mediaStreamCloseOnly = stream
        document.getElementById("mortStream").srcObject = stream;
        const peer = streamerCreatePeer();
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
        signalingServer.send(JSON.stringify({event: 'streamStarted'}));
    } else {
        alert('You are not first in line. Please wait your turn!')
    }
}

let streamPeerCloseOnly
let mediaStreamCloseOnly

function streamerCreatePeer() {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    peer.onnegotiationneeded = () => streamerNegotiation(peer);

    streamPeerCloseOnly = peer
    return peer;
}

async function streamerNegotiation(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    fetch(rtcServer+"/webrtc/broadcast",
        {
            method:"POST",
            body:JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
              },
        }).then(response => {
            if(response.ok)
            {
                console.log(response)
                return response.json()
            }
            console.log(response)
            throw new Error("broadcast endpoint failure");
        }).then(data =>{
            console.log(data)
            const desc = new RTCSessionDescription(data);
            peer.setRemoteDescription(desc).catch(e => console.log(e));
        })
}

async function endStream()
{
    if(mediaStreamCloseOnly)
    {
    mediaStreamCloseOnly.getTracks().forEach(track => { track.stop()})
    }
    if(streamPeerCloseOnly)
    {
        streamPeerCloseOnly.close()
    }
    signalingServer.send(JSON.stringify({event: 'streamEnded'})); //pls dont exploit this
    document.getElementById("endBroadcastButton").style.display = "none"
    document.getElementById("broadcastButton").style.display = "flex"
    
}

async function captureScreen() {
    let mediaStream = null;
    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: true
        }); //get user video and audio as a media stream
        document.getElementById("streamOffline").style.display = "none"
        document.getElementById("mortStream").style.display = "block"
        document.getElementById("mortStream").srcObject = mediaStream
        if(document.getElementById("endBroadcastButton").style.display == "none")
        {
            document.getElementById("endBroadcastButton").style.display = "flex"
            document.getElementById("broadcastButton").style.display = "none"
        }
        return mediaStream;
    } catch (ex) {
        console.log("Error occurred", ex);
        document.getElementById("endBroadcastButton").style.display = "none"
    }
}