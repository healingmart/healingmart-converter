(function (w) {
  "use strict";

  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function addStyle(d) {
    if (d.getElementById("hmEngineColorStyle")) return;
    var s = d.createElement("style");
    s.id = "hmEngineColorStyle";
    s.textContent = [
      ".hm-color-grid{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:20px;align-items:stretch}",
      ".hm-color-preview{min-height:180px;border:1px solid #dbe4ef;border-radius:20px;background:linear-gradient(135deg,#f8fafc,#edf2f7);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)}",
      ".hm-color-result{margin-top:14px;padding:20px;border:1.5px solid #dbe4ef;border-radius:17px;background:#f8fbff}",
      ".hm-color-result span{display:block;color:#66758b;font-size:13px;font-weight:800}",
      ".hm-color-result strong{display:block;margin-top:5px;color:#0b1424;font-size:28px;font-weight:950;word-break:break-word}",
      ".hm-color-example{margin-top:8px;color:#66758b;font-size:13px;font-weight:700;line-height:1.6}",
      "@media(max-width:760px){.hm-color-grid{grid-template-columns:1fr}.hm-color-preview{min-height:130px}.hm-color-result strong{font-size:23px}}"
    ].join("");
    d.head.appendChild(s);
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function nums(v) {
    var a = String(v || "").match(/-?\d+(?:\.\d+)?/g);
    return a ? a.map(Number) : [];
  }

  function parseHex(v) {
    var s = String(v || "").trim().replace(/^#/, "");
    if (s.length === 3) s = s.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error("HEX 값을 확인해 주세요. 예: #3366FF");
    return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
  }

  function parseRgb(v) {
    var a = nums(v);
    if (a.length < 3) throw new Error("RGB 값을 확인해 주세요. 예: 51, 102, 255");
    return [clamp(a[0],0,255), clamp(a[1],0,255), clamp(a[2],0,255)];
  }

  function parseHsl(v) {
    var a = nums(v);
    if (a.length < 3) throw new Error("HSL 값을 확인해 주세요. 예: 220, 100, 60");
    return [((a[0] % 360) + 360) % 360, clamp(a[1],0,100), clamp(a[2],0,100)];
  }

  function parseHsv(v) {
    var a = nums(v);
    if (a.length < 3) throw new Error("HSV 값을 확인해 주세요. 예: 220, 80, 100");
    return [((a[0] % 360) + 360) % 360, clamp(a[1],0,100), clamp(a[2],0,100)];
  }

  function parseCmyk(v) {
    var a = nums(v);
    if (a.length < 4) throw new Error("CMYK 값을 확인해 주세요. 예: 80, 60, 0, 0");
    return [clamp(a[0],0,100), clamp(a[1],0,100), clamp(a[2],0,100), clamp(a[3],0,100)];
  }

  function rgbToHex(rgb) {
    return "#" + rgb.map(function (n) { return Math.round(clamp(n,0,255)).toString(16).padStart(2,"0"); }).join("").toUpperCase();
  }

  function rgbToHsl(rgb) {
    var r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2;
    if(max!==min){var d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h/=6}
    return [Math.round(h*360),Math.round(s*100),Math.round(l*100)];
  }

  function hslToRgb(hsl) {
    var h=hsl[0]/360,s=hsl[1]/100,l=hsl[2]/100,r,g,b;
    if(s===0)r=g=b=l;else{var q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;function hue(t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}r=hue(h+1/3);g=hue(h);b=hue(h-1/3)}
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }

  function rgbToCmyk(rgb) {
    var r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255,k=1-Math.max(r,g,b);
    if(k>=.999999) return [0,0,0,100];
    var c=(1-r-k)/(1-k),m=(1-g-k)/(1-k),y=(1-b-k)/(1-k);
    return [c,m,y,k].map(function(n){return Math.round(n*100);});
  }

  function cmykToRgb(cmyk) {
    var c=cmyk[0]/100,m=cmyk[1]/100,y=cmyk[2]/100,k=cmyk[3]/100;
    return [255*(1-c)*(1-k),255*(1-m)*(1-k),255*(1-y)*(1-k)].map(Math.round);
  }

  function rgbToHsv(rgb) {
    var r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0,s=max===0?0:d/max,v=max;
    if(d!==0){switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60;if(h<0)h+=360}
    return [Math.round(h),Math.round(s*100),Math.round(v*100)];
  }

  function hsvToRgb(hsv) {
    var h=hsv[0],s=hsv[1]/100,v=hsv[2]/100,c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;
    if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
    return [r,g,b].map(function(n){return Math.round((n+m)*255);});
  }

  function formatRgb(rgb) { return "rgb(" + rgb.map(Math.round).join(", ") + ")"; }
  function formatHsl(hsl) { return "hsl(" + Math.round(hsl[0]) + ", " + Math.round(hsl[1]) + "%, " + Math.round(hsl[2]) + "%)"; }
  function formatHsv(hsv) { return "hsv(" + Math.round(hsv[0]) + ", " + Math.round(hsv[1]) + "%, " + Math.round(hsv[2]) + "%)"; }
  function formatCmyk(c) { return "cmyk(" + c.map(Math.round).join("%, ").replace(/%$/,"") + "%)"; }

  function sourceRgb(from, value) {
    var f=String(from||"").toUpperCase();
    if(f==="HEX")return parseHex(value);
    if(f==="RGB")return parseRgb(value);
    if(f==="HSL")return hslToRgb(parseHsl(value));
    if(f==="HSV")return hsvToRgb(parseHsv(value));
    if(f==="CMYK")return cmykToRgb(parseCmyk(value));
    throw new Error("지원하지 않는 색상 입력입니다.");
  }

  function convert(x, value) {
    var rgb=sourceRgb(x.fromFormat,value),to=String(x.toFormat||"").toUpperCase(),result;
    if(to==="HEX")result=rgbToHex(rgb);
    else if(to==="RGB")result=formatRgb(rgb);
    else if(to==="HSL")result=formatHsl(rgbToHsl(rgb));
    else if(to==="HSV")result=formatHsv(rgbToHsv(rgb));
    else if(to==="CMYK")result=formatCmyk(rgbToCmyk(rgb));
    else throw new Error("지원하지 않는 색상 출력입니다.");
    return { result:result, rgb:rgb };
  }

  function placeholderFor(fmt) {
    var f=String(fmt||"").toUpperCase();
    if(f==="HEX")return "#3366FF";
    if(f==="RGB")return "51, 102, 255";
    if(f==="HSL")return "220, 100, 60";
    if(f==="HSV")return "220, 80, 100";
    if(f==="CMYK")return "80, 60, 0, 0";
    return "값 입력";
  }

  NS.color = {
    version: "1.0.0",
    open: function (x, ctx) {
      var d=ctx.document,stage=ctx.stage;
      addStyle(d);
      stage.innerHTML='<div class="hm-fx-detail">'+
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="'+ctx.route({category:x.category})+'" data-route>← '+ctx.esc(ctx.cat(x.category).name)+'</a></div>'+
        ctx.titleBlock(x)+
        '<div class="hm-fx-workbox"><div class="hm-color-grid"><div><div class="hm-fx-field"><label>'+ctx.esc(x.fromFormat)+' 값 입력</label><input class="hm-fx-input" data-in placeholder="'+ctx.esc(placeholderFor(x.fromFormat))+'"></div><div class="hm-color-example">숫자는 쉼표 또는 공백으로 구분해도 됩니다. % 기호가 있어도 자동으로 읽습니다.</div><div class="hm-fx-actions"><button class="hm-fx-btn primary" type="button" data-run>변환</button><button class="hm-fx-btn" type="button" data-copy>결과 복사</button></div><div class="hm-color-result"><span>변환 결과 · '+ctx.esc(x.toFormat)+'</span><strong data-out>결과</strong></div></div><div class="hm-color-preview" data-preview aria-label="색상 미리보기"></div></div><div class="hm-fx-note" data-msg>색상 값은 브라우저에서 바로 계산합니다.</div></div></div>';
      var input=stage.querySelector('[data-in]'),out=stage.querySelector('[data-out]'),preview=stage.querySelector('[data-preview]'),msg=stage.querySelector('[data-msg]');
      function run(){try{var r=convert(x,input.value);out.textContent=r.result;preview.style.background=rgbToHex(r.rgb);msg.textContent='변환이 완료되었습니다.'}catch(e){out.textContent='값을 확인해 주세요.';preview.style.background='linear-gradient(135deg,#f8fafc,#edf2f7)';msg.textContent=e.message||String(e)}}
      stage.querySelector('[data-run]').onclick=run;
      stage.querySelector('[data-copy]').onclick=function(){var v=out.textContent;if(v&&v!=='결과'&&navigator.clipboard)navigator.clipboard.writeText(v);msg.textContent='결과를 복사했습니다.'};
      input.addEventListener('keydown',function(e){if(e.key==='Enter')run()});
    }
  };
})(window);
