const candidates = new Map();

function subtitleScore(url, type='') {
  const u=(url||'').toLowerCase(), ct=(type||'').toLowerCase();
  let score=0;
  if (/\.(srt|vtt|ttml|dfxp|ass|ssa|smi|sami)(?:[?#]|$)/i.test(u)) score+=100;
  if (/(subtitle|subtitles|caption|captions|timedtext|texttrack|webvtt|ttml|sami)/i.test(u)) score+=45;
  if (/(text\/vtt|application\/ttml|subrip|sami|subtitle)/i.test(ct)) score+=100;
  if (/(\.m3u8|manifest|playlist)/i.test(u)) score+=10;
  return score;
}
function labelFromUrl(url){
  try { const u=new URL(url), n=decodeURIComponent(u.pathname.split('/').pop()||''); return n || 'רצועת כתוביות'; } catch { return 'רצועת כתוביות'; }
}
function put(tabId,item){
  if(tabId<0||!item?.url)return;
  const list=candidates.get(tabId)||new Map();
  list.set(item.url,item); candidates.set(tabId,list); updateBadge(tabId);
}
function updateBadge(tabId) {
  const list=[...(candidates.get(tabId)||new Map()).values()];
  const count=list.filter(x=>x.type==='url').length || list.length;
  chrome.action.setBadgeBackgroundColor({tabId,color:'#16C7E8'}).catch(()=>{});
  chrome.action.setBadgeTextColor?.({tabId,color:'#06233A'}).catch(()=>{});
  chrome.action.setBadgeText({tabId,text:count?String(Math.min(count,99)):''}).catch(()=>{});
  chrome.action.setTitle({tabId,title:count?`SubGrab — ${count} רצועות כתוביות זוהו`:'SubGrab — סורק כתוביות אוטומטית'}).catch(()=>{});
}

chrome.webRequest.onHeadersReceived.addListener(details=>{
  if(details.tabId<0)return;
  const ct=(details.responseHeaders||[]).find(h=>h.name?.toLowerCase()==='content-type')?.value||'';
  const score=subtitleScore(details.url,ct);
  if(score<40)return;
  put(details.tabId,{type:'url',source:'Network',url:details.url,label:labelFromUrl(details.url),lang:'',score,contentType:ct});
},{urls:['<all_urls>']},['responseHeaders']);

chrome.webRequest.onCompleted.addListener(details=>{
  if(details.tabId<0)return;
  const score=subtitleScore(details.url);
  if(score<40)return;
  put(details.tabId,{type:'url',source:'Network',url:details.url,label:labelFromUrl(details.url),lang:'',score});
},{urls:['<all_urls>']});

chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg?.type==='SUBGRAB_NETWORK'){
    respond({tracks:[...(candidates.get(msg.tabId)||new Map()).values()]}); return;
  }
  if(msg?.type==='SUBGRAB_FOUND'&&sender.tab?.id>=0){
    const tabId=sender.tab.id,list=candidates.get(tabId)||new Map();
    for(const t of msg.tracks||[]){
      const key=t.url||`${t.source}:${t.mediaIndex??''}:${t.label}:${t.lang}`;
      const old=list.get(key);
      if(t.type!=='cues'||!old?.cues||t.cues?.length>=old.cues.length)list.set(key,t);
    }
    candidates.set(tabId,list); updateBadge(tabId); respond({count:list.size});
  }
});
chrome.tabs.onUpdated.addListener((tabId,changeInfo)=>{if(changeInfo.status==='loading'){candidates.delete(tabId);updateBadge(tabId);}});
chrome.tabs.onRemoved.addListener(tabId=>candidates.delete(tabId));