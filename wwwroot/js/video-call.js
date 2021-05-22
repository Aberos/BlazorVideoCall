window.videoCall = {

    peerConnections: [],
    myStream: MediaStream,
    mediaConstraints: {
        audio: true,            // We want an audio track
        video: true             // ...and we want a video track
    },

    init: function (videoLocalElement, dotNetObject) {
        var that = this;
        that.myStream = MediaStream;

        navigator.mediaDevices.getUserMedia(that.mediaConstraints).then(stream => {
            console.log("local stream loaded");
            that.myStream = stream;
            videoLocalElement.srcObject = stream;
            videoLocalElement.muted = true;
            dotNetObject.invokeMethodAsync("onGetUserMedia");
        }).catch(error => {
            dotNetObject.invokeMethodAsync("errorGetUserMedia", error.toString());
        });
    },

    hasPeerConnection: function (callIdConnect) {
        var that = this;
        return that.peerConnections[callIdConnect] ? true : false ;
    },

    clearPeerConnection: function (callIdConnect) {
        var that = this;
        that.peerConnections[callIdConnect] = null;
    },

    createPeerConnection: function (callIdConnect, divStreams, dotNetObject) {
        var that = this;
        that.peerConnections[callIdConnect] = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        that.peerConnections[callIdConnect].onicecandidate = (iceEvent) => {
            console.log("send iceCandidate from " + callIdConnect);
            dotNetObject.invokeMethodAsync("sendIceCandidate", callIdConnect, iceEvent.candidate);
        };

        that.myStream.getTracks().forEach(track => {
            console.log("add track from " + callIdConnect);
            that.peerConnections[callIdConnect].addTrack(track, that.myStream);
        });

        that.peerConnections[callIdConnect].ontrack = (event) => {
            console.log("recv streams from " + callIdConnect);
            if (event.streams) {
                event.streams.map(stream => {
                    that.createVideoStream(divStreams, callIdConnect, stream);
                    that.resizeVideoDiv();
                });
            }
        };

        that.peerConnections[callIdConnect].ondatachannel = (event) => {
            var { channel } = event;
            channel.binaryType = 'arraybuffer';
            channel.onmessage = (event) => {
                const { data } = event;
                try {
                    var blob = new Blob([data]);
                    that.downloadFile(blob, channel.label);
                    channel.close();
                } catch (err) {
                    console.log('File transfer failed');
                }
            };
        };

        that.peerConnections[callIdConnect].createOffer().then(offer => {
            that.peerConnections[callIdConnect].setLocalDescription(offer).then(result => {
                dotNetObject.invokeMethodAsync("sendOffer", callIdConnect, offer);
            });
        });
    },

    createAnswer: function (callIdOffer, offer, dotNetObject) {
        console.log("recv offer from " + callIdOffer);
        var that = this;
        var offerRtc = new RTCSessionDescription(offer);
        that.peerConnections[callIdOffer].setRemoteDescription(offerRtc).then(remoteDescriptionOffer => {
            that.peerConnections[callIdOffer].createAnswer().then(answer => {
                that.peerConnections[callIdOffer].setLocalDescription(new RTCSessionDescription(answer)).then(localDescription => {
                    console.log("send answer from " + callIdOffer);
                    dotNetObject.invokeMethodAsync("sendAnswer", callIdOffer, answer);
                });
            });
        });
    },

    setAnwser: function (callIdAnswer, answer) {
        console.log("recv answer from " + callIdAnswer);
        var that = this;
        var answerRtc = new RTCSessionDescription(answer);
        that.peerConnections[callIdAnswer].setRemoteDescription(answerRtc).then(remoteDescriptionAnswer => {

        });
    },

    setIceCandidate: function(callIdIceCandidate, iceCandidate) {
        console.log("recv iceCandidate from " + callIdIceCandidate);
        var that = this;
        that.peerConnections[callIdIceCandidate].addIceCandidate(new RTCIceCandidate(iceCandidate)).then(resultIceCandidate => {

        });
    },

    createVideoStream: function (divStreams, callUserId, stream) {
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
    },

    resizeVideoDiv: function() {
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
    },

    removeVideoStream: function (callIdDisconnect, divStreams) {
        var divCall = document.querySelectorAll('div[data-call-id="' + callIdDisconnect + '"]');
        if (divCall[0]) {
            divStreams.removeChild(divCall[0]);
        }
    },

    downloadFile: function(blob, fileName) {
        var a = document.createElement('a');
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    },

    sendFile: function () {
        var that = this;
        var file;
        var channelLabel = file.name;
        if (that.peerConnections) {
            file.arrayBuffer().then(buffer => {
                that.peerConnections.map(peerConnection => {
                    const channel = peerConnection.createDataChannel(channelLabel);
                    channel.binaryType = 'arraybuffer';

                    channel.onopen = () => {
                        channel.send(buffer);
                    }

                    channel.onclose = () => {

                    };
                });
            });
        }
    }
}