using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.JSInterop;
using VideoCall.Data;

namespace VideoCall.Pages
{
    public partial class Index : IDisposable
    {
        [Inject]
        public IJSRuntime JsRuntime { get; set; }

        [Inject]
        public NavigationManager NavigationManager { get; set; }

        [Parameter]
        public string RoomId { get; set; }

        public HubConnection HubConnection { get; set; }

        public ElementReference DivStreams { get; set; }

        public ElementReference VideoLocal { get; set; }

        public string Uid { get; set; }

        private DotNetObjectReference<Index> _dotNetRef;

        private bool _initialized;

        private string _errorMessage;

        private List<string> _clientsOn = new List<string>();

        protected override void OnInitialized()
        {
            Uid = Guid.NewGuid().ToString();

            if (string.IsNullOrWhiteSpace(RoomId))
                RoomId = "123456";

            var uri = new Uri($"https://localhost:44324/videoCallHub?callId={Uid}&roomId={RoomId}");
            HubConnection = new HubConnectionBuilder().WithUrl(uri)
                .WithAutomaticReconnect()
                .Build();

            HubConnection.On<string, string, bool, int, List<CallUser>>("CallUserConnectRoom", CallUserConnectRoom);
            HubConnection.On<string, RTCDescription>("RecvOffer", RecvOffer);
            HubConnection.On<string, RTCDescription>("RecvAnswer", RecvAnswer);
            HubConnection.On<string, RTCIceCandidate>("RecvIceCandidate", RecvIceCandidate);
            HubConnection.On<string, string>("CallUserDisconnectRoom", CallUserDisconnectRoom);

            _dotNetRef = DotNetObjectReference.Create(this);

            base.OnInitialized();
        }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                await JsRuntime.InvokeVoidAsync("videoCall.init", VideoLocal, _dotNetRef);
            }

            await base.OnAfterRenderAsync(firstRender);
        }

        [JSInvokable("onGetUserMedia")]
        public async Task OnGetUserMedia()
        {
            await HubConnection.StartAsync();
            _clientsOn.Clear();
            _errorMessage = string.Empty;
            _initialized = true;
            StateHasChanged();
        }

        [JSInvokable("errorGetUserMedia")]
        public void ErrorGetUserMedia(string error)
        {
            _initialized = false;
            _errorMessage = error;
            StateHasChanged();
        }

        [JSInvokable("sendOffer")]
        public async Task SendOffer(string callIdConnect, RTCDescription offer)
        {
            await HubConnection.InvokeAsync("sendOffer", Uid, RoomId, callIdConnect, offer);
        }

        [JSInvokable("sendAnswer")]
        public async Task SendAnswer(string callIdOffer, RTCDescription answer)
        {
            await HubConnection.InvokeAsync("SendAnswer", Uid, callIdOffer, RoomId, answer);
        }

        [JSInvokable("sendIceCandidate")]
        public async Task SendIceCandidate(string callIdConnect, RTCIceCandidate iceCandidate)
        {
            await HubConnection.InvokeAsync("SendIceCandidate", Uid, RoomId, callIdConnect, iceCandidate);
        }

        private async Task CallUserConnectRoom(string callIdConnect, string roomId, bool isHost, int roomUsersCount, List<CallUser> clients)
        {
            foreach (var client in clients)
            {
                if (!_clientsOn.Contains(client.CallId))
                {
                    _clientsOn.Add(client.CallId);
                    await JsRuntime.InvokeVoidAsync("videoCall.createPeerConnection", client.CallId, DivStreams, _dotNetRef);
                }
            }
        }

        private async Task RecvOffer(string callIdOffer, RTCDescription offer)
        {
            await JsRuntime.InvokeVoidAsync("videoCall.createAnswer", callIdOffer, offer, _dotNetRef);
        }

        private async Task RecvAnswer(string callIdAnswer, RTCDescription answer)
        {
            await JsRuntime.InvokeVoidAsync("videoCall.setAnwser", callIdAnswer, answer);
        }

        private async Task RecvIceCandidate(string callIdIceCandidate, RTCIceCandidate iceCandidate)
        {
            await JsRuntime.InvokeVoidAsync("videoCall.setIceCandidate", callIdIceCandidate, iceCandidate);
        }

        private async Task CallUserDisconnectRoom(string callIdDisconnect, string roomId)
        {
            await ClearPeerConnection(callIdDisconnect);
            await RemoveStreamPeerConnection(callIdDisconnect);
            _clientsOn.Remove(callIdDisconnect);
        }

        private async Task<bool> HasPeerConnection(string callIdConnect)
        {
            return await JsRuntime.InvokeAsync<bool>("videoCall.hasPeerConnection", callIdConnect);
        }

        private async Task ClearPeerConnection(string callIdConnect)
        {
            await JsRuntime.InvokeVoidAsync("videoCall.clearPeerConnection", callIdConnect);
        }

        private async Task RemoveStreamPeerConnection(string callIdDisconnect)
        {
            await JsRuntime.InvokeVoidAsync("videoCall.removeVideoStream", callIdDisconnect, DivStreams);
        }

        public void Dispose()
        {
            HubConnection.StopAsync();
        }
    }
}
