(() => {
  const seen = new Map();
  const cueTracks = new Map();
  let reportTimer;

  function keyOf(item){ return item.url || `${item.source}:${item.mediaIndex ?? ''}:${item.label}:${item.lang}`; }
  function add(item) {
    const key=keyOf(item), old=seen.get(key);
    if(item.type==='cues' && old?.cues?.length > item.cues.length) return;
    seen.set(key,item);
  }
  function report(){
    clearTimeout(reportTimer);
    reportTimer=setTimeout(()=>chrome.runtime.sendMessage({type:'SUBGRAB_FOUND',tracks:[...seen.values()]}).catch(()=>{}),150);
  }
  function collectTrack(track, mediaIndex, i){
    const key=`TextTrack:${mediaIndex}:${track.label||i}:${track.language||''}`;
    const state=cueTracks.get(key)||{cues:new Map()};
    const ingest=()=>{
      try {
        for(const c of Array.from(track.cues||[])) state.cues.set(`${c.startTime}|${c.endTime}|${c.text}`,{start:c.startTime,end:c.endTime,text:c.text});
        const cues=[...state.cues.values()].sort((a,b)=>a.start-b.start||a.end-b.end);
        if(cues.length){add({type:'cues',source:'TextTrack',label:track.label||`TextTrack ${i+1}`,lang:track.language||'',cues,mediaIndex});report();}
      } catch(_){}
    };
    if(!state.bound){ try{track.addEventListener('cuechange',ingest);state.bound=true;}catch(_){} }
    cueTracks.set(key,state); ingest();
  }
  function scan() {
    document.querySelectorAll('video, audio').forEach((media, mediaIndex) => {
      media.querySelectorAll('track').forEach((track, i) => {
        if (track.src) add({type:'url',source:'HTML track',url:track.src,label:track.label||`Track ${i+1}`,lang:track.srclang||'',mediaIndex});
      });
      try { Array.from(media.textTracks||[]).forEach((track,i)=>collectTrack(track,mediaIndex,i)); } catch (_) {}
    });
    document.querySelectorAll('a[href], source[src]').forEach(el=>{
      const url=el.href||el.src;
      if(url && /\.(srt|vtt|ttml|dfxp|ass|ssa|smi|sami)(?:[?#]|$)/i.test(url)) add({type:'url',source:'Page resource',url,label:url.split('/').pop(),lang:''});
    });
    report(); return [...seen.values()];
  }
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href']});
  setInterval(scan,2000); scan();
  chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
    if(msg?.type==='SUBGRAB_SCAN'){respond({tracks:scan(),title:document.title});return;}
    if(msg?.type==='SUBGRAB_REFRESH_CUES'){scan();respond({tracks:[...seen.values()]});return;}
  });
})();