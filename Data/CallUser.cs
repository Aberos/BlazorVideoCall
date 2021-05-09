namespace VideoCall.Data
{
    public class CallUser
    {
        public CallUser()
        {
            
        }

        public CallUser(string callId, string connectionId)
        {
            CallId = callId;
            ConnectionId = connectionId;
        }

        public string CallId { get; set; }

        public string ConnectionId { get; set; }
    }
}
