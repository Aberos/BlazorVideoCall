using System.Threading.Tasks;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace VideoCall.Pages
{
    public partial class Index
    {
        [Inject]
        public IJSRuntime JsRuntime { get; set; }

        [Inject]
        public NavigationManager NavigationManager { get; set; }

        public string RoomId { get; set; } = "123456";

        public ElementReference DivStreams { get; set; }

        public ElementReference VideoLocal { get; set; }

        private bool _isHost;

        private bool _inCall;

        private bool _hasUserConnect;

        protected override void OnInitialized()
        {
            _isHost = NavigationManager.ToBaseRelativePath(NavigationManager.Uri).ToLower() == "host";
            base.OnInitialized();
        }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                var dotNetReference = DotNetObjectReference.Create(this);
                await JsRuntime.InvokeVoidAsync("videoCall.init", RoomId, VideoLocal, DivStreams, dotNetReference);
            }
            await base.OnAfterRenderAsync(firstRender);
        }

        private async Task InitCall()
        {
            _inCall = true;
            await JsRuntime.InvokeVoidAsync("videoCall.startCall");
        }

        [JSInvokable("enableStartButton")]
        private void EnableStartButton()
        {
            if (_isHost)
            {
                _hasUserConnect = true;
                StateHasChanged();
            }
        }
    }
}
