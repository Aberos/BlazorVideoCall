namespace VideoCall.Data
{
    public class CallUser
    {
        public CallUser()
        {
            
        }

        public CallUser(string userName, string connectionId)
        {
            Username = userName;
            ConnectionId = connectionId;
        }

        public string Username { get; set; }

        public string ConnectionId { get; set; }
    }
}
