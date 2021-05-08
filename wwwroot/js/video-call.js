window.videoCall = {
    myHubConnection: null,
    myStream: MediaStream,
    myPeerConnection: null,
    myOffer: null,
    myUid: null,
    myRoomId: null,
    mediaConstraints: {
        audio: true,            // We want an audio track
        video: true             // ...and we want a video track
    },

    init: function (roomId, videoLocalElement, divStreams, dotNetObject) {
        var that = this;
        that.myPeerConnection = null;
        that.myStream = MediaStream;
        that.myUid = that.getUserUid();
        that.myRoomId = roomId;
        that.myHubConnection = new signalR.HubConnectionBuilder().withUrl(`/videoCallHub?username=${that.myUid}&roomId=${that.myRoomId}`).build();
        that.myHubConnection.start().then(function () {
            console.log("connection start");
        }).catch(function (err) {
            return console.error(err.toString());
        });

        that.myPeerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        navigator.mediaDevices.getUserMedia(that.mediaConstraints).then(stream => {
            console.log("add stream");
            that.myStream = stream;
            videoLocalElement.srcObject = stream;
            videoLocalElement.muted = true;
            stream.getTracks().forEach(track => {
                console.log("add track");
                that.myPeerConnection.addTrack(track, stream);
            });
            if (stream.getVideoTracks().length == 0) {
                videoLocalElement.setAttribute("poster", "/imgs/speaker.png");
            }
        }).catch(error => {
            console.log(error);
        });

        that.myHubConnection.on("RecvOffer", function (userOffer, offerJson) {
            var offer = JSON.parse(offerJson);
            console.log("recv offer from " + userOffer);
            var offerRtc = new RTCSessionDescription(offer);
            that.myPeerConnection.setRemoteDescription(offerRtc).then(remoteDescriptionOffer => {
                that.myPeerConnection.createAnswer().then(answer => {
                    that.myPeerConnection.setLocalDescription(new RTCSessionDescription(answer)).then(localDescription => {
                        console.log("send answer from " + userOffer);
                        var answerJson = JSON.stringify(answer);
                        that.myHubConnection.invoke("SendAnswer", that.myUid, userOffer, that.myRoomId, answerJson).catch(function (err) {
                            return console.error(err.toString());
                        });
                    });
                });
            });
        });

        that.myHubConnection.on("RecvAnswer", function (userAnswer, answerJson) {
            console.log("recv answer from " + userAnswer);
            var answer = JSON.parse(answerJson);
            var answerRtc = new RTCSessionDescription(answer);
            that.myPeerConnection.setRemoteDescription(answerRtc).then(remoteDescriptionAnswer => {

            });
        });

        that.myPeerConnection.onicecandidate = (iceEvent) => {
            console.log("send iceCandidate ");
            var iceCandidateJson = JSON.stringify(iceEvent.candidate);
            that.myHubConnection.invoke("SendIceCandidate", that.myUid, that.myRoomId, iceCandidateJson).catch(function (err) {
                return console.error(err.toString());
            });
        };

        that.myHubConnection.on("RecvIceCandidate", function (userIceCandidate, iceCandidateJson) {
            console.log("recv iceCandidate from " + userIceCandidate);
            var iceCandidate = JSON.parse(iceCandidateJson);
            that.myPeerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).then(resultIceCandidate => {

            });
        });

        that.myPeerConnection.ontrack = (event) => {
            console.log("recv streams");
            if (event.streams) {
                event.streams.map(stream => {
                    var colSize = event.streams.length > 1 ? "col-md-6" : "";
                    that.createVideoStream(divStreams, stream, colSize);
                });
            }
        };

        that.myHubConnection.on("RecvDisconnectLog", function (log) {
            console.log(log);
        });

        that.myHubConnection.on("CallUserConnectRoom", function (userConnect, roomId, isHost, roomUsersCount) {
            console.log(userConnect, roomId, isHost);
            if (Number(roomUsersCount) > 1) {
                dotNetObject.invokeMethodAsync("enableStartButton");
            }
        });
    },

    startCall: function () {
        var that = this;
        if (that.myPeerConnection) {
            that.myPeerConnection.createOffer().then(offer => {
                that.myOffer = offer;
                that.myPeerConnection.setLocalDescription(offer).then(result => {
                    var offerJson = JSON.stringify(offer);
                    that.myHubConnection.invoke("SendOffer", that.myUid, that.myRoomId, offerJson).catch(function(err) {
                        return console.error(err.toString());
                    });
                });
            });
        } else {
            console.log("peer connection not found");
        }
    },

    getUserUid: function() {
        var userUid = localStorage.getItem("user-uid");
        if (userUid)
            return userUid;

        userUid = this.generateUserUid();
        localStorage.setItem("user-uid", userUid);
        return userUid;
    },

    generateUserUid: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    createVideoStream: function(divStreams, stream, colSize) {
        var divVideo = document.createElement('div');
        divVideo.classList.add("col-12");
        divVideo.classList.add("h-100");
        if (colSize) {
            divVideo.classList.add(colSize);
        }
        var videoStream = document.createElement('video');
        videoStream.classList.add("h-100", "w-100");
        videoStream.srcObject = stream;
        if (stream.getVideoTracks().length == 0) {
            videoStream.setAttribute("poster", "/imgs/speaker.png");
        }
        divVideo.appendChild(videoStream);
        divStreams.appendChild(divVideo);
    }
}