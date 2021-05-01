using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace VideoCall.Hubs
{
    public class VideoCallHub : Hub
    {
        public async Task SendOffer(string user, string message)
        {
            await Clients.All.SendAsync("RecvOffer", user, message);
        }

        public async Task SendIceCandidate(string user, string message)
        {
            await Clients.All.SendAsync("RecvIceCandidate", user, message);
        }
    }
}
