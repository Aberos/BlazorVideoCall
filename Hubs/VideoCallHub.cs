using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using VideoCall.Data;

namespace VideoCall.Hubs
{
    public class VideoCallHub : Hub
    {

        public static Dictionary<string, List<CallUser>> Rooms = new Dictionary<string, List<CallUser>>();

        public override async Task OnConnectedAsync()
        {
            var callId = Context.GetHttpContext().Request.Query["callId"].ToString();
            var roomId = Context.GetHttpContext().Request.Query["roomId"].ToString();
            var callUser = new CallUser(callId, Context.ConnectionId);
            await ConnectUserRoom(roomId, callUser);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var roomIds = Rooms.Keys.ToList();
            foreach (var roomId in roomIds)
            {
                if (Rooms[roomId].Any(x => x.ConnectionId == Context.ConnectionId))
                {
                    var callId = Rooms[roomId].Find(x => x.ConnectionId == Context.ConnectionId)?.CallId;
                    Rooms[roomId] = RemoveUserFromRoom(roomId, Context.ConnectionId);
                    await Clients.Clients(Rooms[roomId].Select(x=> x.ConnectionId).ToList()).SendAsync("CallUserDisconnectRoom", callId, roomId);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendOffer(string callIdSendOffer, string roomId, string callIdRecvOffer, string message)
        {
            var roomUsers = GetRoomUsers(roomId).FindAll(x => x.CallId == callIdRecvOffer).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvOffer", callIdSendOffer, message);
        }

        public async Task SendAnswer(string callIdSendAnswer, string callIdRecvAnswer, string roomId, string message)
        {
            var userOfferConnections = GetRoomUsers(roomId).FindAll(x => x.CallId == callIdRecvAnswer).Select(x=> x.ConnectionId).ToList();
            await Clients.Clients(userOfferConnections).SendAsync("RecvAnswer", callIdSendAnswer, message);
        }

        public async Task SendIceCandidate(string callIdIceCandidate, string roomId, string callIdReceiveIceCandidate, string message)
        {
            var roomUsers = GetRoomUsers(roomId).FindAll(x => x.CallId == callIdReceiveIceCandidate).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvIceCandidate", callIdIceCandidate, message);
        }

        private async Task ConnectUserRoom(string roomId, CallUser user)
        {
            if (!Rooms.TryGetValue(roomId, out var users))
                Rooms.Add(roomId, new List<CallUser>());

            if (!Rooms[roomId].Contains(user))
            {
                Rooms[roomId].Add(user);
            }

            if (Rooms[roomId].Any(x=> x.CallId != user.CallId))
            {
                await Clients.Clients(Rooms[roomId].Select(x => x.ConnectionId).ToList())
                    .SendAsync("CallUserConnectRoom", user.CallId, roomId, false, Rooms[roomId].Count, Rooms[roomId]);
            }
        }

        private List<CallUser> GetRoomUsers(string roomId)
        {
            if (Rooms.TryGetValue(roomId, out var users))
                return users;

            return users;
        }

        private List<CallUser> RemoveUserFromRoom(string roomId, string connectionId)
        {
            if (Rooms.TryGetValue(roomId, out var roomUsers))
            {
                var newRoomUser = roomUsers.FindAll(x => x.ConnectionId != connectionId);
                return newRoomUser;
            }

            return roomUsers;
        }
    }
}
