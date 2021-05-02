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
            ConnectUserRoom(roomId, callUser);

            await base.OnConnectedAsync();
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

        private void ConnectUserRoom(string roomId, CallUser user)
        {
            if (!Rooms.TryGetValue(roomId, out var users))
                Rooms.Add(roomId, new List<CallUser>());

            if (!Rooms[roomId].Contains(user))
            {
                Rooms[roomId].Add(user);
            }
        }

        private List<CallUser> GetRoomUsers(string roomId)
        {
            if (Rooms.TryGetValue(roomId, out var users))
                return users;

            return users;
        }
    }
}
