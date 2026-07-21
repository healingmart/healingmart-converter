(function(w){
"use strict";
var NS=w.HM_CONVERTER_ENGINES=w.HM_CONVERTER_ENGINES||{};

function addStyle(d){
  if(d.getElementById("hmEngineSubtitleStyle"))return;
  var s=d.createElement("style");
  s.id="hmEngineSubtitleStyle";
  s.textContent=[
    ".hm-sub-upload{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:13px 15px;border:1px dashed #b9cbe0;border-radius:14px;background:#f8fbff}",
    ".hm-sub-upload strong{color:#172033;font-size:14px;font-weight:950}.hm-sub-upload span{color:#66758b;font-size:12px;font-weight:700}",
    ".hm-sub-upload button{min-height:42px;padding:0 14px;border:1px solid #cfd9e7;border-radius:11px;background:#fff;color:#315fd0;font-size:13px;font-weight:900;cursor:pointer}",
    ".hm-sub-grid{display:grid;grid-template-columns:minmax(0,1fr) 54px minmax(0,1fr);gap:12px;align-items:stretch}",
    ".hm-sub-arrow{display:grid;place-items:center;color:#4667df;font-size:27px;font-weight:950}",
    ".hm-sub-area{width:100%;min-height:330px;padding:17px;border:1.5px solid #d8e2ee;border-radius:16px;background:#fff;color:#111827;font:600 15px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
    ".hm-sub-area:focus{border-color:#2f7cf6;box-shadow:0 0 0 4px rgba(47,124,246,.08)}",
    ".hm-sub-options{display:none;margin:14px 0;padding:14px 15px;border:1px solid #dce7f0;border-radius:14px;background:#f8fbff}.hm-sub-options.is-show{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
    ".hm-sub-options label{display:block;color:#42536b;font-size:12px;font-weight:850}.hm-sub-options select{width:100%;height:44px;margin-top:6px;padding:0 11px;border:1px solid #d5dfeb;border-radius:10px;background:#fff;color:#111827;font-weight:800}",
    ".hm-sub-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.hm-sub-meta span{padding:7px 10px;border-radius:999px;background:#eef5ff;color:#31527b;font-size:12px;font-weight:850}",
    ".hm-sub-limit{margin-top:14px;padding:13px 15px;border-radius:13px;background:#f5f8fc;color:#52627a;font-size:13px;font-weight:750;line-height:1.65}",
    "@media(max-width:760px){.hm-sub-upload{align-items:flex-start;flex-direction:column}.hm-sub-grid{grid-template-columns:1fr}.hm-sub-arrow{display:none}.hm-sub-area{min-height:240px;font-size:14px}.hm-sub-options.is-show{grid-template-columns:1fr}}"
  ].join("");
  d.head.appendChild(s);
}

function clean(s){return String(s==null?"":s).replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n")}
function pad(n,l){n=String(Math.max(0,Math.floor(Number(n)||0)));while(n.length<l)n="0"+n;return n}
function fmtSrt(ms){
  ms=Math.max(0,Math.round(ms));
  var h=Math.floor(ms/3600000);ms-=h*3600000;
  var m=Math.floor(ms/60000);ms-=m*60000;
  var s=Math.floor(ms/1000);ms-=s*1000;
  return pad(h,2)+":"+pad(m,2)+":"+pad(s,2)+","+pad(ms,3)
}
function fmtVtt(ms){return fmtSrt(ms).replace(",",".")}
function fmtAss(ms){
  ms=Math.max(0,Math.round(ms));
  var h=Math.floor(ms/3600000);ms-=h*3600000;
  var m=Math.floor(ms/60000);ms-=m*60000;
  var s=Math.floor(ms/1000);ms-=s*1000;
  return h+":"+pad(m,2)+":"+pad(s,2)+"."+pad(Math.floor(ms/10),2)
}
function fracMs(s){
  s=String(s||"");
  if(s.length===1)return Number(s)*100;
  if(s.length===2)return Number(s)*10;
  return Number((s+"000").slice(0,3))
}
function timeSrt(v){
  var m=String(v||"").trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if(!m)return NaN;
  return Number(m[1])*3600000+Number(m[2])*60000+Number(m[3])*1000+fracMs(m[4])
}
function timeAss(v){
  var m=String(v||"").trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[.](\d{1,2})$/);
  if(!m)return NaN;
  var cs=Number(m[4].length===1?m[4]+"0":m[4]);
  return Number(m[1])*3600000+Number(m[2])*60000+Number(m[3])*1000+cs*10
}
function parseArrow(line){
  var m=String(line||"").match(/(\d{1,3}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,3}:\d{2}:\d{2}[,.]\d{1,3})(?:\s+.*)?$/);
  if(!m)return null;
  var a=timeSrt(m[1]),b=timeSrt(m[2]);
  if(!isFinite(a)||!isFinite(b)||b<a)return null;
  return[a,b]
}
function parseSrt(text){
  var blocks=clean(text).trim().split(/\n{2,}/),cues=[];
  blocks.forEach(function(block){
    var lines=block.split("\n");
    if(lines.length&&/^\s*\d+\s*$/.test(lines[0]))lines.shift();
    var ti=-1,times=null;
    for(var i=0;i<lines.length;i++){times=parseArrow(lines[i]);if(times){ti=i;break}}
    if(!times)return;
    var t=lines.slice(ti+1).join("\n").trim();
    if(t)cues.push({start:times[0],end:times[1],text:t})
  });
  if(!cues.length)throw new Error("SRT 자막 시간 정보를 찾지 못했습니다.");
  return cues
}
function parseVtt(text){
  var src=clean(text).replace(/^WEBVTT[^\n]*\n?/i,"").trim();
  var blocks=src.split(/\n{2,}/),cues=[];
  blocks.forEach(function(block){
    var lines=block.split("\n");
    var ti=-1,times=null;
    for(var i=0;i<lines.length;i++){times=parseArrow(lines[i]);if(times){ti=i;break}}
    if(!times)return;
    var t=lines.slice(ti+1).join("\n").trim();
    if(t)cues.push({start:times[0],end:times[1],text:t})
  });
  if(!cues.length)throw new Error("VTT 자막 시간 정보를 찾지 못했습니다.");
  return cues
}
function splitFields(s,count){
  var out=[],start=0;
  for(var i=0;i<count-1;i++){
    var p=s.indexOf(",",start);
    if(p<0){out.push(s.slice(start));start=s.length;break}
    out.push(s.slice(start,p));start=p+1
  }
  out.push(s.slice(start));
  while(out.length<count)out.push("");
  return out
}
function assPlainText(v){
  return String(v||"")
    .replace(/\{[^}]*\}/g,"")
    .replace(/\\N/g,"\n").replace(/\\n/g,"\n").replace(/\\h/g," ")
    .trim()
}
function parseAss(text){
  var lines=clean(text).split("\n"),inEvents=false,format=null,cues=[];
  lines.forEach(function(line){
    var t=line.trim();
    if(/^\[Events\]$/i.test(t)){inEvents=true;return}
    if(/^\[.*\]$/.test(t)&&!/^\[Events\]$/i.test(t)){inEvents=false;return}
    if(!inEvents)return;
    var fm=t.match(/^Format\s*:\s*(.+)$/i);
    if(fm){format=fm[1].split(",").map(function(x){return x.trim().toLowerCase()});return}
    var dm=line.match(/^\s*Dialogue\s*:\s*(.*)$/i);
    if(!dm)return;
    var f=format||["layer","start","end","style","name","marginl","marginr","marginv","effect","text"];
    var vals=splitFields(dm[1],f.length),obj={};
    f.forEach(function(k,i){obj[k]=vals[i]||""});
    var a=timeAss(obj.start),b=timeAss(obj.end);
    if(!isFinite(a)||!isFinite(b)||b<a)return;
    var txt=assPlainText(obj.text);
    if(txt)cues.push({start:a,end:b,text:txt})
  });
  if(!cues.length)throw new Error("ASS/SSA의 Dialogue 자막을 찾지 못했습니다.");
  return cues
}
function renderSrt(cues){
  return cues.map(function(c,i){return (i+1)+"\n"+fmtSrt(c.start)+" --> "+fmtSrt(c.end)+"\n"+c.text}).join("\n\n")+"\n"
}
function renderVtt(cues){
  return "WEBVTT\n\n"+cues.map(function(c){return fmtVtt(c.start)+" --> "+fmtVtt(c.end)+"\n"+c.text}).join("\n\n")+"\n"
}
function renderAss(cues,ssa){
  if(ssa){
    return "[Script Info]\nTitle: HealingMart Converted Subtitle\nScriptType: v4.00\nCollisions: Normal\n\n[V4 Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding\nStyle: Default,Arial,20,16777215,16777215,16777215,0,0,0,1,2,0,2,10,10,10,0,1\n\n[Events]\nFormat: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+
      cues.map(function(c){return "Dialogue: Marked=0,"+fmtAss(c.start)+","+fmtAss(c.end)+",Default,,0000,0000,0000,,"+c.text.replace(/\n/g,"\\N")}).join("\n")+"\n"
  }
  return "[Script Info]\nTitle: HealingMart Converted Subtitle\nScriptType: v4.00+\nWrapStyle: 0\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.601\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+
    cues.map(function(c){return "Dialogue: 0,"+fmtAss(c.start)+","+fmtAss(c.end)+",Default,,0,0,0,,"+c.text.replace(/\n/g,"\\N")}).join("\n")+"\n"
}
function txtCues(text,duration){
  var lines=clean(text).split("\n").map(function(x){return x.trim()}).filter(Boolean);
  if(!lines.length)throw new Error("TXT 내용을 입력해 주세요.");
  var d=Math.max(1,Math.min(15,Number(duration)||3))*1000;
  return lines.map(function(t,i){return{start:i*d,end:(i+1)*d,text:t}})
}

function frameTime(frame,fps){
  var ms=Math.round((Number(frame)||0)*1000/(Number(fps)||25));
  return ms
}
function stripMicroDvdTags(text){
  return String(text||"")
    .replace(/\{y:[^}]*\}/gi,"")
    .replace(/\{f:[^}]*\}/gi,"")
    .replace(/\{s:[^}]*\}/gi,"")
    .replace(/\{c:[^}]*\}/gi,"")
    .replace(/\{p:[^}]*\}/gi,"")
    .replace(/\|/g,"\n")
    .trim()
}
function parseMicroDvd(input,fpsValue){
  var lines=String(input||"").replace(/\r\n?/g,"\n").split("\n");
  var fps=Number(fpsValue)||25,cues=[],matched=0,declaredFps=0;

  lines.forEach(function(line){
    line=line.trim();
    if(!line||line==="[BEGIN]"||line==="[END]")return;
    var m=line.match(/^\{(\d+)\}\{(\d+)\}(.*)$/);
    if(!m)return;
    matched++;
    var a=Number(m[1]),b=Number(m[2]),body=String(m[3]||"").trim();

    if(a===1&&b===1&&/^\d+(?:\.\d+)?$/.test(body)){
      var f=Number(body);
      if(f>=10&&f<=120)declaredFps=f;
      return
    }

    cues.push({startFrame:a,endFrame:b,text:stripMicroDvdTags(body)})
  });

  if(declaredFps)fps=declaredFps;
  if(!matched||!cues.length){
    throw new Error("텍스트 기반 MicroDVD SUB 형식을 찾지 못했습니다. VobSub(.idx + .sub) 바이너리 자막은 지원하지 않습니다.")
  }
  if(!(fps>0))throw new Error("FPS 값을 확인해 주세요.");

  return {
    fps:fps,
    cues:cues.map(function(c){
      return {start:frameTime(c.startFrame,fps),end:frameTime(c.endFrame,fps),text:c.text}
    })
  }
}
function convert(engine,input,opt){
  var cues;
  if(engine==="srt-vtt")return renderVtt(parseSrt(input));
  if(engine==="vtt-srt")return renderSrt(parseVtt(input));
  if(engine==="ass-srt"||engine==="ssa-srt")return renderSrt(parseAss(input));
  if(engine==="srt-ass")return renderAss(parseSrt(input),false);
  if(engine==="srt-ssa")return renderAss(parseSrt(input),true);
  if(engine==="srt-txt")return parseSrt(input).map(function(c){return c.text}).join("\n\n")+"\n";
  if(engine==="vtt-txt")return parseVtt(input).map(function(c){return c.text}).join("\n\n")+"\n";
  if(engine==="txt-srt")return renderSrt(txtCues(input,opt&&opt.duration));
  if(engine==="sub-srt")return renderSrt(parseMicroDvd(input,opt&&opt.fps).cues);
  throw new Error("지원하지 않는 자막 변환입니다.")
}
function limitation(x){
  if(x.engine==="sub-srt")return "텍스트 기반 MicroDVD SUB의 {시작프레임}{종료프레임}자막 형식을 SRT로 변환합니다. 파일 안에 FPS 선언이 있으면 우선 사용하고, 없으면 선택한 FPS를 사용합니다. VobSub 바이너리 SUB는 지원하지 않습니다.";
  if(x.engine==="txt-srt")return "TXT → SRT는 한 줄을 한 개의 자막으로 보고 선택한 표시 시간에 맞춰 순서대로 타임코드를 생성합니다. 원본 영상의 실제 발화 시점과 자동 동기화하는 기능은 아닙니다.";
  if(x.engine==="ass-srt"||x.engine==="ssa-srt")return "ASS/SSA의 Dialogue 텍스트와 시작·종료 시간을 변환합니다. 글꼴, 위치, 색상, 효과 같은 스타일 태그는 SRT에 포함되지 않습니다.";
  if(x.engine==="srt-ass"||x.engine==="srt-ssa")return "SRT의 시간과 텍스트를 기본 스타일의 ASS/SSA로 변환합니다. 원본에 없던 복잡한 위치·색상 효과는 자동 생성하지 않습니다.";
  return "자막 텍스트와 타임코드를 브라우저에서 직접 변환합니다. UTF-8 파일 사용을 권장합니다.";
}
function acceptFor(x){
  var f=String(x.fromFormat||"").toLowerCase();
  if(f==="srt")return ".srt,application/x-subrip,text/plain";
  if(f==="vtt")return ".vtt,text/vtt,text/plain";
  if(f==="ass")return ".ass,text/plain";
  if(f==="ssa")return ".ssa,text/plain";
  if(f==="txt")return ".txt,text/plain";
  if(f==="sub")return ".sub,text/plain";
  return ".txt,text/plain"
}
function extFor(x){return String(x.toFormat||"txt").toLowerCase()}
function safeBase(name){return String(name||"subtitle").replace(/\.[^.]+$/,"").replace(/[\\/:*?\"<>|]+/g,"-")||"subtitle"}
async function readTextFile(file){
  var b=new Uint8Array(await file.arrayBuffer()),utf=new TextDecoder("utf-8",{fatal:false}).decode(b);
  var bad=(utf.match(/\uFFFD/g)||[]).length;
  if(bad>Math.max(2,utf.length*.01)){
    try{
      var kr=new TextDecoder("euc-kr",{fatal:false}).decode(b),bad2=(kr.match(/\uFFFD/g)||[]).length;
      if(bad2<bad)return kr
    }catch(e){}
  }
  return utf
}
function cueCount(engine,out){
  try{
    if(engine==="srt-vtt")return parseVtt(out).length;
    if(engine==="vtt-srt"||engine==="ass-srt"||engine==="ssa-srt"||engine==="txt-srt"||engine==="sub-srt")return parseSrt(out).length;
    if(engine==="srt-ass"||engine==="srt-ssa")return parseAss(out).length
  }catch(e){}
  return 0
}

NS.subtitle={
  version:"1.1.0",
  open:function(x,ctx){
    var d=ctx.document,stage=ctx.stage;
    addStyle(d);
    stage.innerHTML='<div class="hm-fx-detail">'+
      '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="'+ctx.route({category:x.category})+'" data-route>← '+ctx.esc(ctx.cat(x.category).name)+'</a></div>'+
      ctx.titleBlock(x)+
      '<div class="hm-fx-workbox">'+
        '<div class="hm-sub-upload"><div><strong>'+ctx.esc(x.fromFormat)+' 파일 불러오기</strong><span>파일을 선택하거나 아래 입력창에 직접 붙여넣을 수 있습니다.</span></div><button type="button" data-file-btn>파일 선택</button><input type="file" data-file hidden accept="'+ctx.esc(acceptFor(x))+'"></div>'+
        '<div class="hm-sub-options '+((x.engine==="txt-srt"||x.engine==="sub-srt")?"is-show":"")+'" data-options>'+
          (x.engine==="sub-srt"
            ? '<label>영상 FPS<select data-fps><option value="23.976">23.976</option><option value="24">24</option><option value="25" selected>25</option><option value="29.97">29.97</option><option value="30">30</option><option value="60">60</option></select></label><label>FPS 처리<select disabled><option>파일 선언 우선 · 없으면 선택값</option></select></label>'
            : '<label>자막 한 줄 표시 시간<select data-duration><option value="2">2초</option><option value="3" selected>3초</option><option value="4">4초</option><option value="5">5초</option><option value="6">6초</option></select></label><label>생성 방식<select disabled><option>한 줄 = 자막 1개</option></select></label>')+
        '</div>'+
        '<div class="hm-sub-grid"><textarea class="hm-sub-area" data-in spellcheck="false" placeholder="'+ctx.esc(x.fromFormat)+' 내용을 입력하거나 파일을 불러오세요."></textarea><div class="hm-sub-arrow">→</div><textarea class="hm-sub-area" data-out readonly spellcheck="false" placeholder="변환 결과"></textarea></div>'+
        '<div class="hm-sub-meta" data-meta></div>'+
        '<div class="hm-fx-actions"><button class="hm-fx-btn primary" type="button" data-run>변환하기</button><button class="hm-fx-btn" type="button" data-copy>결과 복사</button><a class="hm-fx-btn" data-download href="#" download hidden>결과 다운로드</a></div>'+
        '<div class="hm-sub-limit">'+ctx.esc(limitation(x))+'</div>'+
        '<div class="hm-fx-note" data-msg>자막 파일을 불러오거나 내용을 입력해 주세요.</div>'+
      '</div></div>';
    var fi=stage.querySelector("[data-file]"),fb=stage.querySelector("[data-file-btn]"),inp=stage.querySelector("[data-in]"),out=stage.querySelector("[data-out]");
    var run=stage.querySelector("[data-run]"),copy=stage.querySelector("[data-copy]"),dl=stage.querySelector("[data-download]"),msg=stage.querySelector("[data-msg]"),meta=stage.querySelector("[data-meta]"),dur=stage.querySelector("[data-duration]"),fps=stage.querySelector("[data-fps]");
    var objectUrl="";
    function revoke(){if(objectUrl){try{URL.revokeObjectURL(objectUrl)}catch(e){}objectUrl=""}}
    fb.onclick=function(){fi.click()};
    fi.onchange=async function(){
      var f=fi.files&&fi.files[0];if(!f)return;
      if(f.size>10*1024*1024){msg.textContent="자막 파일은 10MB 이하를 권장합니다.";return}
      try{inp.value=await readTextFile(f);msg.textContent=f.name+" 파일을 불러왔습니다."}catch(e){msg.textContent="파일을 읽지 못했습니다."}
    };
    run.onclick=function(){
      revoke();dl.hidden=true;meta.innerHTML="";
      try{
        var result=convert(x.engine,inp.value,{duration:dur&&dur.value,fps:fps&&fps.value});
        out.value=result;
        var ext=extFor(x),blobText=(ext==="vtt"?"":"\uFEFF")+result;
        objectUrl=URL.createObjectURL(new Blob([blobText],{type:"text/plain;charset=utf-8"}));
        dl.href=objectUrl;dl.download=safeBase(fi.files&&fi.files[0]?fi.files[0].name:"converted")+"."+ext;dl.hidden=false;
        var cc=cueCount(x.engine,result),bits=[];
        if(cc)bits.push("자막 "+cc.toLocaleString("ko-KR")+"개");
        bits.push(result.length.toLocaleString("ko-KR")+"자");
        meta.innerHTML=bits.map(function(v){return"<span>"+ctx.esc(v)+"</span>"}).join("");
        msg.textContent="변환이 완료되었습니다."
      }catch(e){out.value="";msg.textContent=e&&e.message?e.message:String(e)}
    };
    copy.onclick=function(){
      if(!out.value)return;
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(out.value).then(function(){msg.textContent="결과를 복사했습니다."}).catch(function(){out.focus();out.select()})
      }else{out.focus();out.select()}
    }
  }
};
})(window);
