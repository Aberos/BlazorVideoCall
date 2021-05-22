namespace VideoCall.Data
{
    public class RTCIceCandidate
    {
        public string Candidate { get; set; }

        public string Component { get; set; }

        public string Foundation { get; set; }

        public string Ip { get; set; }

        public int Port { get; set; }

        public long Priority { get; set; }

        public string Address { get; set; }

        public string Protocol { get; set; }

        public string RelatedAddress { get; set; }

        public int? RelatedPort { get; set; }

        public string SdpMid { get; set; }

        public int? SdpMLineIndex { get; set; }

        public string TcpType { get; set; }

        public string Type { get; set; }

        public string UsernameFragment { get; set; }
    }
}
