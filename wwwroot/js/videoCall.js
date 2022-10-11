window.videoCall =
{
    peerConnections: [],
    myStream: MediaStream,
    mediaConstraints: {
        audio: true,            // We want an audio track
        video: true             // ...and we want a video track
    },
    hubConnection: null,
    myUid: null,
    roomId: null,
    clientsHub: [],
    callIdsConnected: []
}

export async function init(videoLocalElement, host, roomId, myUid, divStreams, dotNetObject) {
    try {
        var localStream = await navigator.mediaDevices.getUserMedia(window.videoCall.mediaConstraints);

        var connection = new signalR.HubConnectionBuilder()
            .withUrl(host)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        await connection.start();
        window.videoCall.myStream = localStream;
        window.videoCall.hubConnection = connection;
        window.videoCall.roomId = roomId;
        window.videoCall.myUid = myUid;

        videoLocalElement.srcObject = localStream;
        videoLocalElement.muted = true;

        connection.on("CallUserConnectRoom", async (callIdConnect, roomId, isHost, clients) => {
            if (clients) {
                window.videoCall.clientsHub = clients.filter(client => client.callId != myUid);
                window.videoCall.clientsHub.map(async (client) => {
                    var hasCallId = window.videoCall.callIdsConnected.some(callId => callId == client.callId);
                    if (!hasCallId) {
                        window.videoCall.callIdsConnected.push(client.callId);
                        await createPeerConnection(client.callId, divStreams);
                    }
                });
            } else {
                window.videoCall.clientsHub = [];
            }
        });

        connection.on("RecvOffer", (callIdOffer, offer) => {
            createAnswer(callIdOffer, offer, divStreams);
        });

        connection.on("RecvAnswer", (callIdAnswer, answer) => {
            setAnwser(callIdAnswer, answer)
        });

        connection.on("RecvIceCandidate", (callIdIceCandidate, iceCandidate) => {
            setIceCandidate(callIdIceCandidate, iceCandidate)
        });

        connection.on("CallUserDisconnectRoom", (callIdDisconnect, roomId) => {
            clearPeerConnection(callIdDisconnect);
            removeVideoStream(callIdDisconnect, divStreams);
        });

        dotNetObject.invokeMethodAsync("onGetUserMedia");
    } catch (error) {
        dotNetObject.invokeMethodAsync("errorGetUserMedia", error.toString());
    }
}

export async function createPeerConnection(callIdConnect, divStreams) {
    var videoCall = window.videoCall;
    videoCall.peerConnections[callIdConnect] = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    videoCall.peerConnections[callIdConnect].ondatachannel = (event) => {
        var { channel } = event;
        channel.binaryType = 'arraybuffer';
        channel.onmessage = (event) => {
            const { data } = event;
            try {
                var blob = new Blob([data]);
                downloadFile(blob, channel.label);
                channel.close();
            } catch (err) {
                console.log('File transfer failed');
            }
        };
    };

    videoCall.myStream.getTracks().forEach(track => {
        videoCall.peerConnections[callIdConnect].addTrack(track, videoCall.myStream);
    });

    videoCall.peerConnections[callIdConnect].ontrack = (event) => {
        if (event.streams) {
            event.streams.map(stream => {
                createVideoStream(divStreams, callIdConnect, stream);
                resizeVideoDiv();
            });
        }
    };

    videoCall.peerConnections[callIdConnect].onicecandidate = (iceEvent) => {
        videoCall.hubConnection.invoke("SendIceCandidate", videoCall.myUid, videoCall.roomId, callIdConnect, iceEvent.candidate);
    };

    var offer = await videoCall.peerConnections[callIdConnect].createOffer();
    await videoCall.peerConnections[callIdConnect].setLocalDescription(offer);
    videoCall.hubConnection.invoke("SendOffer", videoCall.myUid, videoCall.roomId, callIdConnect, offer);
}

export function clearPeerConnection(callIdConnect) {
    var videoCall = window.videoCall;
    videoCall.clientsHub = videoCall.clientsHub.filter(client => client.callId != callIdConnect);
    videoCall.callIdsConnected = videoCall.callIdsConnected.filter(callId => callId != callIdConnect);
    videoCall.peerConnections[callIdConnect] = null;
}

export async function createAnswer(callIdOffer, offer, divStreams) {
    var videoCall = window.videoCall;
    videoCall.peerConnections[callIdOffer] = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    videoCall.myStream.getTracks().forEach(track => {
        videoCall.peerConnections[callIdOffer].addTrack(track, videoCall.myStream);
    });

    videoCall.peerConnections[callIdOffer].ontrack = (event) => {
        if (event.streams) {
            event.streams.map(stream => {
                createVideoStream(divStreams, callIdOffer, stream);
                resizeVideoDiv();
            });
        }
    };

    videoCall.peerConnections[callIdOffer].onicecandidate = (iceEvent) => {
        videoCall.hubConnection.invoke("SendIceCandidate", videoCall.myUid, videoCall.roomId, callIdOffer, iceEvent.candidate);
    };

    videoCall.callIdsConnected.push(callIdOffer);

    var offerRtc = new RTCSessionDescription(offer);
    await videoCall.peerConnections[callIdOffer].setRemoteDescription(offerRtc);

    var answer = await videoCall.peerConnections[callIdOffer].createAnswer();
    await videoCall.peerConnections[callIdOffer].setLocalDescription(new RTCSessionDescription(answer));
    videoCall.hubConnection.invoke("SendAnswer", videoCall.myUid, callIdOffer, videoCall.roomId, answer);
}

export function setAnwser(callIdAnswer, answer) {
    var videoCall = window.videoCall;
    var answerRtc = new RTCSessionDescription(answer);
    videoCall.peerConnections[callIdAnswer].setRemoteDescription(answerRtc)
}

export function setIceCandidate(callIdIceCandidate, iceCandidate) {
    var videoCall = window.videoCall;
    videoCall.peerConnections[callIdIceCandidate].addIceCandidate(iceCandidate);
}

export function createVideoStream(divStreams, callUserId, stream) {
    if (document.querySelector('[data-call-id="' + callUserId + '"]')) {
        var oldElement = document.querySelector('[data-call-id="' + callUserId + '"]')
        oldElement.remove();
    }

    var divVideo = document.createElement('div');
    divVideo.setAttribute("data-call-id", callUserId);
    divVideo.classList.add("col-12");
    divVideo.classList.add("h-100");
    divVideo.classList.add("video-stream");
    var videoStream = document.createElement('video');
    videoStream.classList.add("h-100", "w-100");
    videoStream.srcObject = stream;
    videoStream.setAttribute("controls", true);
    videoStream.setAttribute("autoplay", true);
    videoStream.setAttribute("playsinline", true);
    if (stream.getVideoTracks().length == 0) {
        //videoStream.setAttribute("poster", "/imgs/speaker.png");
    }
    divVideo.appendChild(videoStream);
    divStreams.appendChild(divVideo);
}

export function removeVideoStream(callIdDisconnect, divStreams) {
    var divCall = document.querySelectorAll('div[data-call-id="' + callIdDisconnect + '"]');
    if (divCall[0]) {
        divStreams.removeChild(divCall[0]);
    }
}

export function resizeVideoDiv() {
    var usersDivs = document.querySelectorAll('div[data-call-id]');
    if (usersDivs) {
        Array.from(usersDivs).map(divElement => {
            if (usersDivs.length > 1) {
                divElement.classList.add("col-md-6");
            } else {
                divElement.classList.remove("col-md-6");
            }
        });
    }
}

export function downloadFile(blob, fileName) {
    var a = document.createElement('a');
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}

export async function sendFile(file) {
    var videoCall = window.videoCall;
    var channelLabel = file.name;
    if (videoCall.peerConnections) {
        var buffer = await file.arrayBuffer();
        videoCall.peerConnections.map(peerConnection => {
            const channel = peerConnection.createDataChannel(channelLabel);
            channel.binaryType = 'arraybuffer';

            channel.onopen = () => {
                channel.send(buffer);
            }

            channel.onclose = () => {

            };
        });
    }
}