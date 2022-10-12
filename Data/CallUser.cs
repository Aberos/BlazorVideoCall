namespace VideoCall.Data
{
    public class CallUser
    {
        public CallUser()
        {
            
        }

        public CallUser(string callId, string name, string connectionId, bool isHost = false)
        {
            CallId = callId;
            Name = name;
            ConnectionId = connectionId;
            IsHost = isHost;
        }

        public string CallId { get; set; }

        public string Name { get; set; }

        public string ConnectionId { get; set; }

        public bool IsHost { get; set; }
    }
}
