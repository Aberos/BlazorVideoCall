window.videoCall = {
    myHubConnection: null,
    myStream: MediaStream,
    myUid: null,
    myRoomId: null,
    mediaConstraints: {
        audio: true,            // We want an audio track
        video: true             // ...and we want a video track
    },

    peerConnections: [],

    init: function (roomId, videoLocalElement, divStreams, dotNetObject) {
        var that = this;
        that.myPeerConnection = null;
        that.myStream = MediaStream;
        that.myUid = that.getUserUid();
        that.myRoomId = roomId;
        that.myHubConnection = new signalR.HubConnectionBuilder().withUrl(`/videoCallHub?callId=${that.myUid}&roomId=${that.myRoomId}`).build();

        navigator.mediaDevices.getUserMedia(that.mediaConstraints).then(stream => {
            console.log("get local stream");
            that.myHubConnection.start().then(function () {
                console.log("connection hub start");
                that.myStream = stream;
                videoLocalElement.srcObject = stream;
                videoLocalElement.muted = true;
                if (stream.getVideoTracks().length == 0) {
                    videoLocalElement.setAttribute("poster", "/imgs/speaker.png");
                }

                that.myHubConnection.on("CallUserConnectRoom", function (callIdConnect, roomId, isHost, roomUsersCount, clients) {
                    console.log(callIdConnect, roomId, isHost);
                    if (Number(roomUsersCount) > 1) {
                        clients.map(client => {
                            if (!that.peerConnections[client.callId] && client.callId != that.myUid) {
                                that.peerConnections[client.callId] = new RTCPeerConnection({
                                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                                });

                                that.peerConnections[client.callId].onicecandidate = (iceEvent) => {
                                    console.log("send iceCandidate from " + client.callId);
                                    var iceCandidateJson = JSON.stringify(iceEvent.candidate);
                                    that.myHubConnection.invoke("SendIceCandidate", that.myUid, that.myRoomId, client.callId, iceCandidateJson).catch(function (err) {
                                        return console.error(err.toString());
                                    });
                                };

                                stream.getTracks().forEach(track => {
                                    console.log("add track from " + client.callId);
                                    that.peerConnections[client.callId].addTrack(track, stream);
                                });


                                that.peerConnections[client.callId].ontrack = (event) => {
                                    console.log("recv streams from " + client.callId);
                                    if (event.streams) {
                                        event.streams.map(stream => {
                                            that.createVideoStream(divStreams, client.callId, stream);
                                            that.resizeVideoDiv();
                                        });
                                    }
                                };
                            }
                        });

                        that.peerConnections[callIdConnect].createOffer().then(offer => {
                            that.peerConnections[callIdConnect].setLocalDescription(offer).then(result => {
                                var offerJson = JSON.stringify(offer);
                                that.myHubConnection.invoke("SendOffer", that.myUid, that.myRoomId, callIdConnect, offerJson).catch(function (err) {
                                    return console.error(err.toString());
                                });
                            });
                        });
                    }
                });
            }).catch(function (err) {
                return console.error(err.toString());
            });
        }).catch(error => {
            console.log(error);
            alert(error);
        });

        that.myHubConnection.on("RecvOffer", function (callIdOffer, offerJson) {
            var offer = JSON.parse(offerJson);
            console.log("recv offer from " + callIdOffer);
            var offerRtc = new RTCSessionDescription(offer);
            that.peerConnections[callIdOffer].setRemoteDescription(offerRtc).then(remoteDescriptionOffer => {
                that.peerConnections[callIdOffer].createAnswer().then(answer => {
                    that.peerConnections[callIdOffer].setLocalDescription(new RTCSessionDescription(answer)).then(localDescription => {
                        console.log("send answer from " + callIdOffer);
                        var answerJson = JSON.stringify(answer);
                        that.myHubConnection.invoke("SendAnswer", that.myUid, callIdOffer, that.myRoomId, answerJson).catch(function (err) {
                            return console.error(err.toString());
                        });
                    });
                });
            });
        });

        that.myHubConnection.on("RecvAnswer", function (callIdAnswer, answerJson) {
            console.log("recv answer from " + callIdAnswer);
            var answer = JSON.parse(answerJson);
            var answerRtc = new RTCSessionDescription(answer);
            that.peerConnections[callIdAnswer].setRemoteDescription(answerRtc).then(remoteDescriptionAnswer => {

            });
        });

        that.myHubConnection.on("RecvIceCandidate", function (callIdIceCandidate, iceCandidateJson) {
            console.log("recv iceCandidate from " + callIdIceCandidate);
            var iceCandidate = JSON.parse(iceCandidateJson);
            that.peerConnections[callIdIceCandidate].addIceCandidate(new RTCIceCandidate(iceCandidate)).then(resultIceCandidate => {

            });
        });

        that.myHubConnection.on("CallUserDisconnectRoom", function (callIdDisconnect, roomId) {
            console.log(log);
            var divCall = document.querySelectorAll('div[data-call-id=' + callIdDisconnect + ']');
            if (divCall[0]) {
                divStreams.removeChild(divCall[0]);
            }
        });
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

    createVideoStream: function (divStreams, callUserId, stream) {
        var divVideo = document.createElement('div');
        divVideo.setAttribute("data-call-id", callUserId);
        divVideo.classList.add("col-12");
        divVideo.classList.add("h-100");
        var videoStream = document.createElement('video');
        videoStream.classList.add("h-100", "w-100");
        videoStream.srcObject = stream;
        if (stream.getVideoTracks().length == 0) {
            videoStream.setAttribute("poster", "/imgs/speaker.png");
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
    }
}