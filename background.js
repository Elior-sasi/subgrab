const candidates = new Map();

function looksLikeSubtitle(details) {
  const u = details.url || '';
  return /\.(srt|vtt|ttml|dfxp|ass|ssa|smi|sami)(?:[?#]|$)/i.test(u) ||
    /(?:subtitle|subtitles|caption|captions|timedtext|texttrack|webvtt|ttml|sami)/i.test(u);
}

function updateBadge(tabId) {
  const count = (candidates.get(tabId) || new Map()).size;
  chrome.action.setBadgeBackgroundColor({tabId, color:'#12BFE8'}).catch(()=>{});
  chrome.action.setBadgeText({tabId, text: count ? String(count) : ''}).catch(()=>{});
  chrome.action.setTitle({tabId, title: count ? `SubGrab — ${count} רצועות כתוביות זוהו` : 'SubGrab'}).catch(()=>{});
}

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.tabId < 0 || !looksLikeSubtitle(details)) return;
  const list = candidates.get(details.tabId) || new Map();
  list.set(details.url, {type:'url', source:'Network', url:details.url, label:'Network subtitle', lang:''});
  candidates.set(details.tabId, list);
  updateBadge(details.tabId);
}, {urls:['<all_urls>']});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type === 'SUBGRAB_NETWORK') {
    respond({tracks:[...(candidates.get(msg.tabId) || new Map()).values()]});
    return;
  }
  if (msg?.type === 'SUBGRAB_FOUND' && sender.tab?.id >= 0) {
    const tabId=sender.tab.id, list=candidates.get(tabId)||new Map();
    for (const t of msg.tracks||[]) list.set(t.url||`${t.source}:${t.label}:${t.lang}`,t);
    candidates.set(tabId,list); updateBadge(tabId); respond({count:list.size});
  }
});

chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') { candidates.delete(tabId); updateBadge(tabId); }
});
chrome.tabs?.onRemoved?.addListener(tabId => candidates.delete(tabId));