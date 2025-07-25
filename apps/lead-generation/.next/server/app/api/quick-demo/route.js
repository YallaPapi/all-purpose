(()=>{var a={};a.id=365,a.ids=[365],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},2061:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>B,patchFetch:()=>A,routeModule:()=>w,serverHooks:()=>z,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>y});var d={};c.r(d),c.d(d,{GET:()=>v});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(694);async function v(a){try{let b=new u.Ay({apiKey:process.env.OPENAI_API_KEY}),d=a.headers.get("x-forwarded-proto")||"https",e=a.headers.get("x-vercel-deployment-url")||a.headers.get("host")||"solarbookers.com",f=`${d}://${e}`;console.log("Creating quick demo with domain:",f);let g=await b.beta.assistants.create({name:"Quick Demo Business Services Assistant",instructions:`Your job is to qualify leads over SMS for business services. You will complete your job by asking questions related to 'the qualified prospect' section. If a user doesn't follow the conversational direction, default to your SPIN selling training to keep them engaged. Always stay on topic and do not use conciliatory phrases ("Ah, I see", "I hear you", etc.) when the user expresses disinterest.

PROSPECT INFORMATION:
- Name: Demo User
- Company: Quick Demo Business Co
- Title: Business Owner
- Location: Austin, TX
- Industry: Business Services
- Company Description: Professional business consulting and support services

Your Output style: casual message, conversational, American casual
Your training: The Challenger Sale, Business Services

FIRST Message: "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?"

Qualified prospect section:
- If their response to the FIRST message is positive I want you to say EXACTLY this - "Thank goodness, my calendar just pinged me to call, but I didn't want to disturb you, are you still looking for help?" but if their response to the FIRST message was negative I want you to say EXACTLY this "Sorry about that, just to confirm, are you interested in business services?". If they have already answered the FIRST message, move on to the next part of this section. 
- Find out what specific business challenges they're facing and what kind of support they need.
- Tell them we can help streamline their operations and increase efficiency, then ask them if they'd like to schedule a call to discuss their specific needs.
- If they say yes, send the following message - "Great! Here's my calendar for you to book in a time - https://calendly.com/quick-demo-business"

Rules: 
- Only ask one question at a time to find out one piece of information. Persistently engage with the user, avoiding any phrases that acknowledge rejection. 
- Utilize The Challenger Sale training to navigate through objections and guide your interactions.
- You are not AI; you are Sarah, working in admin at Business Lead Pro.
- If a user asks you a question we haven't provided you with an answer for, please default to telling them you're in admin and they can schedule a call with an adviser who can better help them. 
- If they ask for pricing, push for them to speak to an advisor.
- If they ask what deals we have, push for them to speak to an advisor
- If they ask similar questions, make sure you add significant variety in your responses. Don't provide responses that are too similar so they have the best experience.
- Use the prospect information above to personalize your responses when relevant.

Note: 
- This is the message they're responding to: "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?". Therefore, omit introductions & begin conversation.
- Today's Date is ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}.

FAQ:
- We are Business Lead Pro
- Website: https://businessleadpro.com
- They submitted an inquiry into our website a few months ago
- Opening Hours are 9am to 5pm Monday to Friday.
- We help businesses optimize their operations and grow their revenue through professional consulting services.
- Our service typically helps businesses increase efficiency by 20-30%.
- If they ask where we got their details/data from you MUST tell them "You made an enquiry via our website, if you no longer wish to speak with us, reply with the word 'delete'"`,model:"gpt-4-1106-preview",tools:[{type:"code_interpreter"}]}),h="quick-demo-business";try{let{Redis:a}=await c.e(846).then(c.bind(c,2846)),b=new a({url:process.env.KV_REST_API_URL,token:process.env.KV_REST_API_TOKEN});await b.set(`company:${h}`,g.id),console.log(`Stored assistant ${g.id} for ${h}`)}catch(a){console.log("Warning: Could not store in Redis:",a)}let i=`${f}/${h}`,j=`<!DOCTYPE html>
<html>
<head>
  <title>Quick Demo Created - Business Lead System</title>
  <style>
    body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; margin-bottom: 20px; }
    .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .demo-link { font-size: 18px; background: #2563eb; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .demo-link:hover { background: #1d4ed8; }
    .info { background: #e0f2fe; border: 1px solid #0284c7; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .meta { font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    .test-chat { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Quick Demo Created Successfully!</h1>
    
    <div class="success">
      <strong>Demo Status:</strong> Ready to test<br>
      <strong>Company:</strong> Quick Demo Business Co<br>
      <strong>Assistant ID:</strong> ${g.id}<br>
      <strong>Domain:</strong> ${f}
    </div>

    <a href="${i}" target="_blank" class="demo-link">🚀 Open Working Demo</a>

    <div class="info">
      <strong>Testing Instructions:</strong><br>
      1. Click the demo link above<br>
      2. Wait for the assistant message to appear<br>
      3. Type a response to test the chat functionality<br>
      4. Verify that the threadId is properly maintained between messages
    </div>

    <div class="test-chat">
      <strong>Expected First Message:</strong><br>
      "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?"
    </div>

    <div class="meta">
      Created: ${new Date().toISOString()}<br>
      URL: ${i}<br>
      Assistant: ${g.id}<br>
      Redis Storage: ${process.env.KV_REST_API_URL?"Enabled":"Disabled"}
    </div>
  </div>
</body>
</html>`;return new Response(j,{headers:{"Content-Type":"text/html"}})}catch(a){return console.error("Quick demo creation failed:",a),new Response(`<!DOCTYPE html>
<html>
<head><title>Demo Creation Failed</title></head>
<body style="font-family: Arial; padding: 40px; text-align: center;">
  <h1 style="color: red;">❌ Demo Creation Failed</h1>
  <p><strong>Error:</strong> ${a instanceof Error?a.message:"Unknown error"}</p>
  <p><strong>Debug Info:</strong></p>
  <pre style="background: #f5f5f5; padding: 20px; text-align: left; border-radius: 5px;">${JSON.stringify({hasOpenAIKey:!!process.env.OPENAI_API_KEY,hasRedisUrl:!!process.env.KV_REST_API_URL,error:a instanceof Error?a.stack:a},null,2)}</pre>
</body>
</html>`,{headers:{"Content-Type":"text/html"}})}}let w=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/quick-demo/route",pathname:"/api/quick-demo",filename:"route",bundlePath:"app/api/quick-demo/route"},distDir:".next",projectDir:"",resolvedPagePath:"C:\\Users\\stuar\\Desktop\\Projects\\all-purpose\\apps\\lead-generation\\app\\api\\quick-demo\\route.tsx",nextConfigOutput:"",userland:d}),{workAsyncStorage:x,workUnitAsyncStorage:y,serverHooks:z}=w;function A(){return(0,g.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:y})}async function B(a,b,c){var d;let e="/api/quick-demo/route";"/index"===e&&(e="/");let g=await w.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:x,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(z.dynamicRoutes[E]||z.routes[D]);if(F&&!y){let a=!!z.routes[D],b=z.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||w.isDev||y||(G="/index"===(G=D)?"/":G);let H=!0===w.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:z,renderOpts:{experimental:{dynamicIO:!!x.experimental.dynamicIO,authInterrupts:!!x.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=x.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>w.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>w.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await w.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await w.handleResponse({req:a,nextConfig:x,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(L||await w.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},6559:(a,b,c)=>{"use strict";a.exports=c(4870)},6946:(a,b,c)=>{"use strict";Object.defineProperty(b,"I",{enumerable:!0,get:function(){return g}});let d=c(898),e=c(2471),f=c(7912);async function g(a,b,c,g){if((0,d.isNodeNextResponse)(b)){var h;b.statusCode=c.status,b.statusMessage=c.statusText;let d=["set-cookie","www-authenticate","proxy-authenticate","vary"];null==(h=c.headers)||h.forEach((a,c)=>{if("x-middleware-set-cookie"!==c.toLowerCase())if("set-cookie"===c.toLowerCase())for(let d of(0,f.splitCookiesString)(a))b.appendHeader(c,d);else{let e=void 0!==b.getHeader(c);(d.includes(c.toLowerCase())||!e)&&b.appendHeader(c,a)}});let{originalResponse:i}=b;c.body&&"HEAD"!==a.method?await (0,e.pipeToNodeResponse)(c.body,i,g):i.end()}}},7598:a=>{"use strict";a.exports=require("node:crypto")},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[431,694],()=>b(b.s=2061));module.exports=c})();