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

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                var dotNetReference = DotNetObjectReference.Create(this);
                await JsRuntime.InvokeVoidAsync("videoCall.init", RoomId, VideoLocal, DivStreams, dotNetReference);
            }
            await base.OnAfterRenderAsync(firstRender);
        }
    }
}
