const api = globalThis.browser || globalThis.chrome;
let pageTitle = 'subtitles';
const $ = s => document.querySelector(s);

function time(t){
  const ms=Math.max(0,Math.round(t*1000)); const h=Math.floor(ms/3600000); const m=Math.floor(ms%3600000/60000); const s=Math.floor(ms%60000/1000); const x=ms%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;
}
function cuesToSrt(cues){return cues.map((c,i)=>`${i+1}\n${time(c.start)} --> ${time(c.end)}\n${String(c.text).replace(/<[^>]+>/g,'')}\n`).join('\n');}
function vttToSrt(text){
  text=text.replace(/^\uFEFF?WEBVTT[^\n]*\n+/i,'').replace(/^(NOTE|STYLE|REGION)[\s\S]*?(?=\n\n|$)/gm,'');
  const blocks=text.trim().split(/\n{2,}/); let n=0, out=[];
  for(const b of blocks){const lines=b.trim().split('\n'); const ti=lines.findIndex(x=>x.includes('-->')); if(ti<0)continue; const timing=lines[ti].replace(/(\d{2}:\d{2}(?::\d{2})?)\.(\d{3})/g,'$1,$2').replace(/\s+(align|position|size|line|vertical):[^\s]+/g,''); out.push(`${++n}\n${timing}\n${lines.slice(ti+1).join('\n')}`)}
  return out.join('\n\n')+'\n';
}
function xmlToSrt(text){
  const doc=new DOMParser().parseFromString(text,'application/xml'); const ps=[...doc.querySelectorAll('p[begin][end]')];
  return ps.map((p,i)=>`${i+1}\n${xmlTime(p.getAttribute('begin'))} --> ${xmlTime(p.getAttribute('end'))}\n${p.textContent.trim()}\n`).join('\n');
}
function xmlTime(v){let sec;if(/^\d+(\.\d+)?s$/.test(v))sec=parseFloat(v);else{const a=v.replace(',', '.').split(':').map(Number);sec=(a[0]||0)*3600+(a[1]||0)*60+(a[2]||0)}return time(sec)}
function safe(s){return (s||'subtitles').replace(/[\\/:*?"<>|]/g,'_').trim().slice(0,100)}
async function save(text,label){const blob=new Blob(['\uFEFF',text],{type:'application/x-subrip;charset=utf-8'});const url=URL.createObjectURL(blob);await api.downloads.download({url,filename:`${safe(pageTitle)} - ${safe(label)}.srt`,saveAs:true});setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function download(t){
  try{
    if(t.type==='cues') return save(cuesToSrt(t.cues),t.label||t.lang);
    const r=await fetch(t.url,{credentials:'include'}); if(!r.ok)throw new Error(`HTTP ${r.status}`); const text=await r.text();
    const path=new URL(t.url).pathname.toLowerCase(); let srt=path.endsWith('.srt')?text:path.endsWith('.vtt')?vttToSrt(text):xmlToSrt(text); await save(srt,t.label||t.lang||'subtitles');
  }catch(e){$('#status').textContent='לא הצלחתי לקרוא את הרצועה: '+e.message;}
}
function render(tracks){
  const box=$('#tracks');box.textContent='';$('#status').textContent=tracks.length?`נמצאו ${tracks.length} רצועות`:'לא נמצאו כתוביות נגישות כרגע. נסה להפעיל כתוביות בנגן ואז לסרוק שוב.';
  tracks.forEach((t,i)=>{const d=document.createElement('div');d.className='track';const name=document.createElement('strong');name.textContent=t.label||t.lang||`כתוביות ${i+1}`;const meta=document.createElement('div');meta.className='meta';meta.textContent=[t.lang,t.source].filter(Boolean).join(' · ');const b=document.createElement('button');b.textContent='הורד כ־SRT';b.onclick=()=>download(t);d.append(name,meta,b);box.append(d)});
}
async function scan(){
  $('#status').textContent='סורק…'; try{const [tab]=await api.tabs.query({active:true,currentWindow:true});const res=await api.tabs.sendMessage(tab.id,{type:'SUBGRAB_SCAN'});pageTitle=res?.title||tab.title||'subtitles';render(res?.tracks||[])}catch(e){$('#status').textContent='לא ניתן לסרוק את העמוד הזה.'}
}
$('#scan').onclick=scan;scan();