(function(w){
"use strict";
var NS=w.HM_CONVERTER_ENGINES=w.HM_CONVERTER_ENGINES||{};
var MAX_SOURCE=80*1024*1024,MAX_EXPANDED=150*1024*1024,MAX_ENTRIES=500;

function addStyle(d){
  if(d.getElementById("hmEngineArchiveStyle"))return;
  var s=d.createElement("style");s.id="hmEngineArchiveStyle";
  s.textContent=[
    ".hm-ar-upload{min-height:180px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;border:2px dashed #d2bd79;border-radius:20px;background:linear-gradient(135deg,#fffdf7,#fff9e8);text-align:center;cursor:pointer;transition:.16s ease}",
    ".hm-ar-upload:hover,.hm-ar-upload.is-drag{border-color:#d79a14;background:#fff8df}.hm-ar-icon{width:62px;height:62px;display:grid;place-items:center;border-radius:18px;background:#fff0ba;color:#9b6a00;font-size:24px;font-weight:950}",
    ".hm-ar-upload strong{color:#111827;font-size:20px;font-weight:950}.hm-ar-upload p{max-width:650px;margin:0;color:#64748b;font-size:14px;font-weight:700;line-height:1.65}",
    ".hm-ar-file{display:none;margin-top:14px;padding:14px 16px;border:1px solid #eadfbf;border-radius:14px;background:#fffcf2;color:#574b2a;font-size:14px;font-weight:800;word-break:break-all}.hm-ar-file.is-show{display:block}",
    ".hm-ar-result{display:none;margin-top:18px;padding:18px;border:1px solid #dce5ef;border-radius:16px;background:#f8fbff}.hm-ar-result.is-show{display:block}",
    ".hm-ar-result strong{display:block;color:#111827;font-size:20px;font-weight:950}.hm-ar-result p{margin:7px 0 0;color:#52627a;font-size:14px;font-weight:750;line-height:1.6}",
    ".hm-ar-limit{margin-top:14px;padding:13px 15px;border-radius:13px;background:#fff8e9;color:#795413;font-size:13px;font-weight:750;line-height:1.65}",
    "@media(max-width:760px){.hm-ar-upload{min-height:150px;padding:22px 13px}.hm-ar-upload strong{font-size:18px}}"
  ].join("");d.head.appendChild(s)
}
function fmtBytes(n){if(n<1024)return n+" B";if(n<1048576)return(n/1024).toFixed(1)+" KB";return(n/1048576).toFixed(1)+" MB"}
function safeBase(name){return String(name||"archive").replace(/\.(tar\.gz|tgz|zip|tar|gz)$/i,"").replace(/[\\/:*?\"<>|]+/g,"-")||"archive"}
function loadOnce(ctx,url,key,msg){if(w[key])return Promise.resolve(w[key]);return ctx.loadScript(url).then(function(){if(!w[key])throw new Error(msg);return w[key]})}
function ensureZip(ctx){return loadOnce(ctx,"https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js","JSZip","ZIP 처리 기능을 불러오지 못했습니다.")}
function ensurePako(ctx){return loadOnce(ctx,"https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js","pako","GZIP 처리 기능을 불러오지 못했습니다.")}
function cleanPath(name){
  var s=String(name||"").replace(/\\/g,"/").replace(/^[A-Za-z]:/,"").replace(/^\/+/,""),out=[];
  s.split("/").forEach(function(p){if(!p||p===".")return;if(p==="..")throw new Error("상위 폴더 경로(..)가 포함된 항목은 처리하지 않습니다.");out.push(p)});
  return out.join("/")
}
function enc(s){return new TextEncoder().encode(String(s||""))}
function decField(bytes,start,len){
  var end=start+len;while(end>start&&(bytes[end-1]===0||bytes[end-1]===32))end--;
  try{return new TextDecoder("utf-8").decode(bytes.slice(start,end))}catch(e){return""}
}
function putBytes(dst,off,src,max){for(var i=0;i<src.length&&i<max;i++)dst[off+i]=src[i]}
function oct(n,width){
  var s=Math.max(0,Math.floor(Number(n)||0)).toString(8);
  if(s.length>width-1)throw new Error("TAR 헤더에 기록하기에는 파일이 너무 큽니다.");
  return new Array(width-s.length).join("0")+s+"\0"
}
function putAscii(dst,off,str,len){putBytes(dst,off,new TextEncoder().encode(str),len)}
function tarName(path){
  var b=enc(path);if(b.length<=100)return{name:path,prefix:""};
  var parts=path.split("/");
  for(var i=parts.length-1;i>0;i--){
    var prefix=parts.slice(0,i).join("/"),name=parts.slice(i).join("/");
    if(enc(prefix).length<=155&&enc(name).length<=100)return{name:name,prefix:prefix}
  }
  throw new Error("TAR 경로가 너무 깁니다: "+path)
}
function tarHeader(path,size,isDir,mtime){
  var h=new Uint8Array(512),np=tarName(path);
  putBytes(h,0,enc(np.name),100);putAscii(h,100,isDir?"0000755\0":"0000644\0",8);
  putAscii(h,108,"0000000\0",8);putAscii(h,116,"0000000\0",8);putAscii(h,124,oct(isDir?0:size,12),12);
  putAscii(h,136,oct(Math.floor((mtime||Date.now())/1000),12),12);
  for(var i=148;i<156;i++)h[i]=32;h[156]=(isDir?"5":"0").charCodeAt(0);
  putAscii(h,257,"ustar\0",6);putAscii(h,263,"00",2);putAscii(h,265,"HealingMart",32);putAscii(h,297,"HealingMart",32);
  putBytes(h,345,enc(np.prefix),155);
  var sum=0;for(i=0;i<512;i++)sum+=h[i];
  var cs=sum.toString(8);cs=new Array(7-cs.length).join("0")+cs;putAscii(h,148,cs+"\0 ",8);
  return h
}
function concat(chunks,total){
  var out=new Uint8Array(total),off=0;chunks.forEach(function(c){out.set(c,off);off+=c.length});return out
}
async function zipToTar(file,ctx){
  await ensureZip(ctx);var z;
  try{z=await w.JSZip.loadAsync(await file.arrayBuffer())}catch(e){throw new Error("정상적인 ZIP 파일이 아닙니다.")}
  var names=Object.keys(z.files),chunks=[],total=0,expanded=0,count=0;
  for(var i=0;i<names.length;i++){
    var it=z.files[names[i]],path=cleanPath(it.name);if(!path)continue;
    if(++count>MAX_ENTRIES)throw new Error("항목이 너무 많습니다. 한 번에 "+MAX_ENTRIES+"개 이하를 권장합니다.");
    if(it.dir){
      if(path.slice(-1)!=="/")path+="/";
      var hd=tarHeader(path,0,true,Date.now());chunks.push(hd);total+=512;continue
    }
    var data=await it.async("uint8array");expanded+=data.length;
    if(expanded>MAX_EXPANDED)throw new Error("압축을 푼 전체 크기가 150MB를 초과합니다.");
    var h=tarHeader(path,data.length,false,it.date?it.date.getTime():Date.now());chunks.push(h,data);total+=512+data.length;
    var pad=(512-data.length%512)%512;if(pad){chunks.push(new Uint8Array(pad));total+=pad}
  }
  chunks.push(new Uint8Array(1024));total+=1024;
  return{blob:new Blob([concat(chunks,total)],{type:"application/x-tar"}),entries:count,expanded:expanded,download:safeBase(file.name)+".tar"}
}
function isZeroBlock(bytes,off){for(var i=0;i<512;i++)if(bytes[off+i]!==0)return false;return true}
function parseOct(bytes,off,len){var s=decField(bytes,off,len).replace(/\0/g,"").trim();return s?parseInt(s,8)||0:0}
function parseTar(bytes){
  var out=[],off=0,longName="",skipped=0,expanded=0;
  while(off+512<=bytes.length){
    if(isZeroBlock(bytes,off))break;
    var name=decField(bytes,off,100),prefix=decField(bytes,off+345,155),size=parseOct(bytes,off+124,12),type=String.fromCharCode(bytes[off+156]||48);
    var path=longName||(prefix?prefix+"/"+name:name);longName="";
    var dataStart=off+512,dataEnd=dataStart+size;if(dataEnd>bytes.length)throw new Error("TAR 파일 구조가 손상되었습니다.");
    if(type==="L"){
      longName=new TextDecoder("utf-8").decode(bytes.slice(dataStart,dataEnd)).replace(/\0+$/,"").trim();
    }else if(type==="0"||type==="\0"||type==="5"){
      path=cleanPath(path);if(path){
        var dir=type==="5";expanded+=dir?0:size;if(expanded>MAX_EXPANDED)throw new Error("TAR 내부 파일 크기가 150MB를 초과합니다.");
        out.push({name:path+(dir&&path.slice(-1)!=="/"?"/":""),dir:dir,data:dir?null:bytes.slice(dataStart,dataEnd)})
        if(out.length>MAX_ENTRIES)throw new Error("항목이 너무 많습니다. 한 번에 "+MAX_ENTRIES+"개 이하를 권장합니다.")
      }
    }else skipped++;
    off=dataStart+Math.ceil(size/512)*512
  }
  if(!out.length)throw new Error("TAR 안에서 변환할 일반 파일을 찾지 못했습니다.");
  return{entries:out,skipped:skipped,expanded:expanded}
}
async function tarToZip(file,ctx){
  await ensureZip(ctx);var parsed=parseTar(new Uint8Array(await file.arrayBuffer())),zip=new w.JSZip();
  parsed.entries.forEach(function(it){if(it.dir)zip.folder(it.name);else zip.file(it.name,it.data,{binary:true})});
  var blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  return{blob:blob,entries:parsed.entries.length,expanded:parsed.expanded,skipped:parsed.skipped,download:safeBase(file.name)+".zip"}
}
function gzipName(bytes){
  if(bytes.length<10||bytes[0]!==31||bytes[1]!==139)return"";
  var flg=bytes[3],p=10;
  if(flg&4){if(p+2>bytes.length)return"";var xl=bytes[p]|(bytes[p+1]<<8);p+=2+xl}
  if(flg&8){var st=p;while(p<bytes.length&&bytes[p]!==0)p++;try{return new TextDecoder("utf-8").decode(bytes.slice(st,p))}catch(e){return""}}
  return""
}
async function tarToGz(file,ctx){
  await ensurePako(ctx);var b=new Uint8Array(await file.arrayBuffer());
  if(b.length<512)throw new Error("TAR 파일 크기를 확인해 주세요.");
  var parsed=parseTar(b);
  var gz=w.pako.gzip(b,{level:6});
  return{blob:new Blob([gz],{type:"application/gzip"}),entries:parsed.entries.length,expanded:parsed.expanded,skipped:parsed.skipped,download:safeBase(file.name)+".tar.gz"}
}
async function gzToZip(file,ctx){
  await ensurePako(ctx);await ensureZip(ctx);var src=new Uint8Array(await file.arrayBuffer()),raw;
  try{raw=w.pako.ungzip(src)}catch(e){throw new Error("정상적인 GZ 파일이 아니거나 압축을 풀 수 없습니다.")}
  if(raw.length>MAX_EXPANDED)throw new Error("압축을 푼 파일이 150MB를 초과합니다.");
  var name=gzipName(src);
  if(!name){
    var lower=file.name.toLowerCase();
    if(lower.endsWith(".tar.gz"))name=safeBase(file.name)+".tar";
    else if(lower.endsWith(".tgz"))name=safeBase(file.name)+".tar";
    else name=file.name.replace(/\.gz$/i,"")||"decompressed"
  }
  name=cleanPath(name)||"decompressed";
  var zip=new w.JSZip();zip.file(name,raw,{binary:true});
  var blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  return{blob:blob,entries:1,expanded:raw.length,download:safeBase(file.name)+".zip"}
}
function accepts(x){
  var f=String(x.fromFormat||"").toUpperCase();
  if(f==="ZIP")return".zip,application/zip";
  if(f==="TAR")return".tar,application/x-tar";
  if(f==="GZ")return".gz,.tgz,application/gzip,application/x-gzip";
  return""
}
function extOk(file,fmt){
  var n=String(file&&file.name||"").toLowerCase(),f=String(fmt||"").toLowerCase();
  if(f==="gz")return n.endsWith(".gz")||n.endsWith(".tgz");
  return n.endsWith("."+f)
}
function limitation(x){
  if(x.engine==="zip-tar")return "ZIP 내부의 일반 파일과 폴더를 TAR로 다시 묶습니다. 암호가 걸린 ZIP, ZIP64의 일부 극단적인 케이스, 150MB를 넘는 압축 해제 결과는 제한될 수 있습니다.";
  if(x.engine==="tar-zip")return "TAR의 일반 파일과 폴더를 ZIP으로 변환합니다. 심볼릭 링크·특수 장치 같은 TAR 특수 항목은 안전을 위해 제외할 수 있습니다.";
  if(x.engine==="tar-gz")return "TAR 파일 전체를 GZIP으로 압축해 .tar.gz 파일로 저장합니다. TAR 내부 구조를 변경하지 않습니다.";
  return "GZ는 한 개의 데이터 스트림을 압축하는 형식입니다. 압축을 푼 단일 파일을 ZIP 안에 담아 저장합니다."
}
async function transform(x,file,ctx){
  if(x.engine==="zip-tar")return zipToTar(file,ctx);
  if(x.engine==="tar-zip")return tarToZip(file,ctx);
  if(x.engine==="tar-gz")return tarToGz(file,ctx);
  if(x.engine==="gz-zip")return gzToZip(file,ctx);
  throw new Error("지원하지 않는 압축 변환입니다.")
}

NS.archive={
  version:"1.0.0",
  open:function(x,ctx){
    var d=ctx.document,stage=ctx.stage;addStyle(d);
    stage.innerHTML='<div class="hm-fx-detail">'+
      '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="'+ctx.route({category:x.category})+'" data-route>← '+ctx.esc(ctx.cat(x.category).name)+'</a></div>'+
      ctx.titleBlock(x)+
      '<div class="hm-fx-workbox">'+
        '<label class="hm-ar-upload" data-drop><input type="file" data-file hidden accept="'+ctx.esc(x.accept||accepts(x))+'"><span class="hm-ar-icon" aria-hidden="true">ZIP</span><strong>'+ctx.esc(x.fromFormat)+' 파일을 선택하거나 끌어놓으세요.</strong><p>파일은 외부 서버로 보내지 않고 현재 브라우저에서 처리합니다. 원본 파일은 최대 80MB를 권장합니다.</p></label>'+
        '<div class="hm-ar-file" data-filemeta></div>'+
        '<div class="hm-fx-actions"><button class="hm-fx-btn primary" type="button" data-run disabled>변환하기</button><button class="hm-fx-btn" type="button" data-reset>다른 파일 선택</button></div>'+
        '<div class="hm-ar-result" data-result><strong>변환이 완료되었습니다.</strong><p data-summary></p><div class="hm-fx-actions"><a class="hm-fx-btn primary" data-download href="#" download>결과 다운로드</a></div></div>'+
        '<div class="hm-ar-limit">'+ctx.esc(limitation(x))+'</div>'+
        '<div class="hm-fx-note" data-msg>파일을 선택하면 변환을 시작할 수 있습니다.</div>'+
      '</div></div>';
    var fi=stage.querySelector("[data-file]"),drop=stage.querySelector("[data-drop]"),meta=stage.querySelector("[data-filemeta]"),run=stage.querySelector("[data-run]"),reset=stage.querySelector("[data-reset]");
    var result=stage.querySelector("[data-result]"),sum=stage.querySelector("[data-summary]"),dl=stage.querySelector("[data-download]"),msg=stage.querySelector("[data-msg]");
    var selected=null,url="";
    function revoke(){if(url){try{URL.revokeObjectURL(url)}catch(e){}url=""}}
    function choose(file){
      revoke();result.classList.remove("is-show");selected=null;run.disabled=true;
      if(!file){meta.classList.remove("is-show");meta.textContent="";return}
      meta.classList.add("is-show");meta.textContent=file.name+" · "+fmtBytes(file.size);
      if(file.size>MAX_SOURCE){msg.textContent="원본 파일이 80MB를 초과합니다. 더 작은 파일로 나누어 처리해 주세요.";return}
      if(!extOk(file,x.fromFormat)){msg.textContent=x.fromFormat+" 파일을 선택해 주세요.";return}
      selected=file;run.disabled=false;msg.textContent="파일이 준비되었습니다. 변환하기를 눌러 주세요."
    }
    drop.addEventListener("dragover",function(e){e.preventDefault();drop.classList.add("is-drag")});
    drop.addEventListener("dragleave",function(){drop.classList.remove("is-drag")});
    drop.addEventListener("drop",function(e){e.preventDefault();drop.classList.remove("is-drag");choose(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0])});
    fi.onchange=function(){choose(fi.files&&fi.files[0])};
    reset.onclick=function(){fi.value="";choose(null);fi.click()};
    run.onclick=async function(){
      if(!selected)return;run.disabled=true;msg.textContent="압축 파일을 처리하고 있습니다. 잠시만 기다려 주세요.";revoke();
      try{
        var r=await transform(x,selected,ctx);url=URL.createObjectURL(r.blob);dl.href=url;dl.download=r.download;
        var bits=[r.entries+"개 항목",fmtBytes(r.blob.size)];
        if(r.skipped)bits.push("특수 항목 "+r.skipped+"개 제외");
        sum.textContent=bits.join(" · ");result.classList.add("is-show");msg.textContent="변환이 완료되었습니다.";
        result.scrollIntoView({behavior:"smooth",block:"nearest"})
      }catch(e){result.classList.remove("is-show");msg.textContent=e&&e.message?e.message:String(e)}
      finally{run.disabled=!selected}
    }
  }
};
})(window);
