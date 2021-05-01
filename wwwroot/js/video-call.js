﻿window.videoCall = {
    myHubConnection: null,
    myStream: MediaStream,
    myPeerConnection: null,
    myOffer: null,
    myUid: null,

    init: function (videoLocalElement, divStreams) {
        var that = this;
        that.myStream = MediaStream;
        that.myUid = that.getUserUid();
        that.myHubConnection = new signalR.HubConnectionBuilder().withUrl("/videoCallHub").build();

        that.myHubConnection.start().then(function () {
            console.log("connection start");
        }).catch(function (err) {
            return console.error(err.toString());
        });

        that.myPeerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).then(stream => {
            that.myStream = stream;
            videoLocalElement.srcObject = stream;
            videoLocalElement.muted = true;
            stream.getTracks().forEach(track => that.myPeerConnection.addTrack(track, stream));
        }).catch(error => {

        });

        that.myHubConnection.on("RecvOffer", function (user, offerJson) {
            var offer = JSON.parse(offerJson);
            that.myPeerConnection.setRemoteDescription(offer).then(remoteDescriptionOffer => {
                that.myPeerConnection.createAnswer().then(answer => {
                    that.myPeerConnection.setLocalDescription(answer).then(localDescription => {
                        var answerJson = JSON.stringify(answer);
                        that.myHubConnection.invoke("SendAnswer", that.myUid, answerJson).catch(function (err) {
                            return console.error(err.toString());
                        });
                    });
                });
            });
        });

        that.myHubConnection.on("RecvAnswer",
            function (user, answerJson) {
                var answer = JSON.parse(answerJson);
                that.myPeerConnection.setRemoteDescription(answer).then(remoteDescriptionAnswer => {

                });
            });

        that.myPeerConnection.onicecandidate = (iceEvent) => {
            var iceCandidateJson = JSON.stringify(iceEvent.candidate);
            that.myHubConnection.invoke("SendIceCandidate", that.myUid, iceCandidateJson).catch(function (err) {
                return console.error(err.toString());
            });
        };

        that.myHubConnection.on("RecvIceCandidate", function (user, iceCandidateJson) {
            var iceCandidate = JSON.parse(iceCandidateJson);
            that.myPeerConnection.addIceCandidate(iceCandidate).then(resultIceCandidate => {

            });
        });

        that.myPeerConnection.ontrack = (event) => {
            if (event.streams) {
                event.streams.map(stream => {
                    var colSize = event.streams.length > 1 ? "col-md-6" : "";
                    that.createVideoStream(divStreams, stream, colSize);
                });
            }
        };
    },

    startCall: function () {
        var that = this;
        if (that.myPeerConnection) {
            that.myPeerConnection.createOffer().then(offer => {
                that.myOffer = offer;
                that.myPeerConnection.setLocalDescription(offer).then(result => {
                    var offerJson = JSON.stringify(offer);
                    that.myHubConnection.invoke("SendOffer", that.myUid, offerJson).catch(function(err) {
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
        divVideo.classList.add("col-12", colSize, "h-100");
        var videoStream = document.createElement('video');
        videoStream.classList.add("h-100", "w-100");
        videoStream.srcObject = stream;
        divVideo.appendChild(videoStream);
        divStreams.appendChild(divVideo);
    }
}