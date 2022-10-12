using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System;
using System.Security.Claims;
using VideoCall.Data;

namespace VideoCall.Filters
{
    public class HubFilter : IHubFilter
    {
        public async ValueTask<object> InvokeMethodAsync(
        HubInvocationContext invocationContext, Func<HubInvocationContext, ValueTask<object>> next)
        {
            try
            {
                return await next(invocationContext);
            }
            catch (Exception)
            {
                throw;
            }
        }

        public Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
        {
            try
            {
                var token = context.Context?.GetHttpContext()?.Request.Query["token"].ToString();
                var roomId = context.Context?.GetHttpContext()?.Request.Query["roomId"].ToString();
                if (string.IsNullOrEmpty(token))
                    throw new HubException("token is required");

                if (string.IsNullOrEmpty(roomId))
                    throw new HubException("room is required");

                var callUser = GetTokenCallUser(token, context.Context);
                if (callUser == null)
                    throw new HubException("invalid token");

                context.Context?.User?.AddIdentity(new ClaimsIdentity
                {
                    Label = "CallUser",
                    Actor = new ClaimsIdentity
                    {
                         BootstrapContext = callUser,
                         Label = roomId
                    }
                });

                return next(context);
            }
            catch (Exception)
            {
                throw;
            }
        }

        public Task OnDisconnectedAsync(
            HubLifetimeContext context, Exception exception, Func<HubLifetimeContext, Exception, Task> next)
        {
            return next(context, exception);
        }

        private CallUser GetTokenCallUser(string token, HubCallerContext context)
        {
            var callId = Guid.NewGuid().ToString();
            var random = new Random();
            var name = $"User {random.Next(1, 200)}";
            return new CallUser(callId, name, context.ConnectionId);
        }
    }
}
