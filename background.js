const candidates = new Map();

function looksLikeSubtitle(details) {
  const u = details.url || '';
  return /\.(srt|vtt|ttml|dfxp|ass|ssa)(?:[?#]|$)/i.test(u) ||
    /(?:subtitle|subtitles|caption|captions|timedtext|texttrack|webvtt|ttml)/i.test(u);
}

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.tabId < 0 || !looksLikeSubtitle(details)) return;
  const list = candidates.get(details.tabId) || new Map();
  list.set(details.url, {type:'url', source:'Network', url:details.url, label:'Network subtitle', lang:''});
  candidates.set(details.tabId, list);
}, {urls:['<all_urls>']});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type === 'SUBGRAB_NETWORK') {
    respond({tracks:[...(candidates.get(msg.tabId) || new Map()).values()]});
  }
});

chrome.tabs?.onRemoved?.addListener(tabId => candidates.delete(tabId));