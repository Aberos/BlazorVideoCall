using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VideoCall.Data;

namespace VideoCall.Pages
{
    public partial class Index
    {
        [Inject]
        public IJSRuntime JsRuntime { get; set; }

        [Inject]
        public NavigationManager NavigationManager { get; set; }

        [Parameter]
        public string RoomId { get; set; }

        [Parameter]
        public string Token { get; set; }

        public ElementReference DivStreams { get; set; }

        public ElementReference VideoLocal { get; set; }

        private DotNetObjectReference<Index> _dotNetRef;
        private IJSObjectReference _module;
        private bool _initialized;
        private string _errorMessage;

        protected override void OnInitialized()
        {
            if(string.IsNullOrWhiteSpace(Token))
                Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());

            if (string.IsNullOrWhiteSpace(RoomId))
                RoomId = "123456";

            _dotNetRef = DotNetObjectReference.Create(this);

            base.OnInitialized();
        }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                _module = await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/videoCall.js");
                await _module.InvokeVoidAsync("init", 
                    VideoLocal, new Uri($"https://localhost:5001/videoCallHub?token={Token}&roomId={RoomId}"), DivStreams, _dotNetRef);
            }

            await base.OnAfterRenderAsync(firstRender);
        }

        [JSInvokable("onGetUserMedia")]
        public async Task OnGetUserMedia()
        {
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
    }
}
