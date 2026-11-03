(() => {
  const seen = new Map();
  function add(item) { const key=item.url||`${item.source}:${item.label}:${item.lang}`; if(!seen.has(key)) seen.set(key,item); }
  function scan() {
    document.querySelectorAll('video, audio').forEach((media, mediaIndex) => {
      media.querySelectorAll('track').forEach((track, i) => {
        if (track.src) add({type:'url',source:'HTML track',url:track.src,label:track.label||`Track ${i+1}`,lang:track.srclang||'',mediaIndex});
      });
      try {
        Array.from(media.textTracks||[]).forEach((track,i)=>{
          const cues=track.cues?Array.from(track.cues).map(c=>({start:c.startTime,end:c.endTime,text:c.text})):[];
          if(cues.length) add({type:'cues',source:'TextTrack',label:track.label||`TextTrack ${i+1}`,lang:track.language||'',cues,mediaIndex});
        });
      } catch (_) {}
    });
    document.querySelectorAll('a[href], source[src]').forEach(el=>{
      const url=el.href||el.src;
      if(url && /\.(srt|vtt|ttml|dfxp|ass|ssa|smi|sami)(?:[?#]|$)/i.test(url)) add({type:'url',source:'Page resource',url,label:url.split('/').pop(),lang:''});
    });
    return [...seen.values()];
  }
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href']});
  scan();
  chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
    if(msg?.type==='SUBGRAB_SCAN'){respond({tracks:scan(),title:document.title});return;}
    if(msg?.type==='SUBGRAB_REFRESH_CUES'){scan();respond({tracks:[...seen.values()]});return;}
  });
})();