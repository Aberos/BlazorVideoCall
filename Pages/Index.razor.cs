using System.Threading.Tasks;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace VideoCall.Pages
{
    public partial class Index
    {
        [Inject]
        public IJSRuntime JsRuntime { get; set; }

        public ElementReference DivStreams { get; set; }

        public ElementReference VideoLocal { get; set; }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                await JsRuntime.InvokeVoidAsync("videoCall.init", VideoLocal, DivStreams);
            }
            await base.OnAfterRenderAsync(firstRender);
        }
    }
}
