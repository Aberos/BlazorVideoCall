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
            var username = Context.GetHttpContext().Request.Query["username"].ToString();
            var roomId = Context.GetHttpContext().Request.Query["roomId"].ToString();
            var callUser = new CallUser(username, Context.ConnectionId);
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
                    var username = Rooms[roomId].Find(x => x.ConnectionId == Context.ConnectionId)?.Username;
                    Rooms[roomId] = RemoveUserFromRoom(roomId, Context.ConnectionId);
                    var log = $"{username} disconnect from {roomId}";
                    await Clients.Clients(Rooms[roomId].Select(x=> x.ConnectionId).ToList()).SendAsync("RecvDisconnectLog", log);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendOffer(string usernameOffer, string roomId, string message)
        {
            var roomUsers = GetRoomUsers(roomId).FindAll(x => x.Username != usernameOffer).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvOffer", usernameOffer, message);
        }

        public async Task SendAnswer(string usernameAnswer, string usernameOffer, string roomId, string message)
        {
            var userOfferConnections = GetRoomUsers(roomId).FindAll(x => x.Username == usernameOffer).Select(x=> x.ConnectionId).ToList();
            await Clients.Clients(userOfferConnections).SendAsync("RecvAnswer", usernameAnswer, message);
        }

        public async Task SendIceCandidate(string usernameIceCandidate, string roomId, string message)
        {
            var roomUsers = GetRoomUsers(roomId).FindAll(x => x.Username != usernameIceCandidate).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvIceCandidate", usernameIceCandidate, message);
        }

        private async Task ConnectUserRoom(string roomId, CallUser user)
        {
            if (!Rooms.TryGetValue(roomId, out var users))
                Rooms.Add(roomId, new List<CallUser>());

            if (!Rooms[roomId].Contains(user))
            {
                Rooms[roomId].Add(user);
            }

            if (Rooms[roomId].Any(x=> x.Username != user.Username))
            {
                await Clients.Clients(Rooms[roomId].Select(x => x.ConnectionId).ToList())
                    .SendAsync("CallUserConnectRoom", user.Username, roomId, false, Rooms[roomId].Count);
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
