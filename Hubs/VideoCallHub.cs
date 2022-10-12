using System;
using System.Collections.Generic;
using System.Linq;
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
            var roomId = GetContextRoomId();
            var callUser = GetContextUser();
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
                    var name = Rooms[roomId].Find(x => x.ConnectionId == Context.ConnectionId)?.Name;
                    Rooms[roomId] = RemoveUserFromRoom(roomId, Context.ConnectionId);
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                    await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("CallUserDisconnectRoom", callId, name);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendOffer(string callIdRecvOffer, object offer)
        {
            var roomUsers = GetRoomUsers(GetContextRoomId()).FindAll(x => x.CallId == callIdRecvOffer).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvOffer", GetContextUser().CallId, offer);
        }

        public async Task SendAnswer(string callIdRecvAnswer, object answer)
        {
            var userOfferConnections = GetRoomUsers(GetContextRoomId()).FindAll(x => x.CallId == callIdRecvAnswer).Select(x=> x.ConnectionId).ToList();
            await Clients.Clients(userOfferConnections).SendAsync("RecvAnswer", GetContextUser().CallId, answer);
        }

        public async Task SendIceCandidate(string callIdReceiveIceCandidate, object iceCandidate)
        {
            var roomUsers = GetRoomUsers(GetContextRoomId()).FindAll(x => x.CallId == callIdReceiveIceCandidate).Select(x => x.ConnectionId).ToList();
            await Clients.Clients(roomUsers).SendAsync("RecvIceCandidate", GetContextUser().CallId, iceCandidate);
        }

        private async Task ConnectUserRoom(string roomId, CallUser user)
        {
            if (!IsValidRoom(roomId))
                throw new HubException("Invalid room");

            if (!IsValidUser(user))
                throw new HubException("Invalid user");

            if (!Rooms.TryGetValue(roomId, out var users))
                Rooms.Add(roomId, new List<CallUser>());

            if (Rooms[roomId].Contains(user))
                throw new HubException("user is already logged in the room");

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            Rooms[roomId].Add(user);

            if (Rooms[roomId].Any(x=> x.CallId != user.CallId))
            {
                await Clients.GroupExcept(roomId, Context.ConnectionId)
                    .SendAsync("CallUserConnectRoom", user.CallId, user.Name, user.IsHost);                   
            }
        }

        private CallUser GetContextUser()
        {
            var identity = Context.User?.Identities.FirstOrDefault(x => x.Label == "CallUser");
            return identity.Actor.BootstrapContext as CallUser;
        }

        private string GetContextRoomId()
        {
            var identity = Context.User?.Identities.FirstOrDefault(x => x.Label == "CallUser");
            return identity.Actor.Label;
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

        private bool IsValidUser(CallUser user)
        {
            return user?.CallId != null;
        }

        private bool IsValidRoom(string roomId)
        {
            return !string.IsNullOrWhiteSpace(roomId);
        }
    }
}
