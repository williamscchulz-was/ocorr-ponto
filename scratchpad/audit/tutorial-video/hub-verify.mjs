import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const ROOT = path.resolve("public");
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".webp":"image/webp", ".json":"application/json", ".mp4":"video/mp4", ".pdf":"application/pdf", ".woff2":"font/woff2" };
const srv = http.createServer((req,res)=>{
  const url = decodeURIComponent(req.url.split("?")[0]);
  let alvo = path.normalize(path.join(ROOT, url));
  if(!alvo.startsWith(ROOT)){res.writeHead(403);return res.end();}
  if(fs.existsSync(alvo)&&fs.statSync(alvo).isDirectory()) alvo=path.join(alvo,"index.html");
  // range support for video
  fs.stat(alvo,(err,st)=>{
    if(err){res.writeHead(404);return res.end("404");}
    const type = MIME[path.extname(alvo).toLowerCase()]||"application/octet-stream";
    const range = req.headers.range;
    if(range && /^bytes=/.test(range)){
      const [a,b]=range.replace("bytes=","").split("-"); const start=+a; const end=b?+b:st.size-1;
      res.writeHead(206,{"Content-Type":type,"Content-Range":`bytes ${start}-${end}/${st.size}`,"Accept-Ranges":"bytes","Content-Length":end-start+1});
      return fs.createReadStream(alvo,{start,end}).pipe(res);
    }
    res.writeHead(200,{"Content-Type":type,"Content-Length":st.size,"Accept-Ranges":"bytes"});
    fs.createReadStream(alvo).pipe(res);
  });
}).listen(8082);
await new Promise(r=>setTimeout(r,300));

const b = await chromium.launch({headless:true});
const p = await b.newPage();
const msgs=[], errs=[];
p.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") msgs.push(m.type()+": "+m.text().slice(0,160)); });
p.on("pageerror",e=>errs.push(String(e).slice(0,160)));
p.on("requestfailed",r=>errs.push("reqfail: "+r.url().slice(0,80)+" "+(r.failure()?.errorText||"")));
await p.goto("http://localhost:8082/tutorial.html",{waitUntil:"networkidle"});
await p.waitForTimeout(600);
const vid = await p.evaluate(async ()=>{
  const v=document.querySelector("video"); if(!v) return {found:false};
  try{ v.currentTime=1; }catch{}
  await new Promise(r=>{ if(v.readyState>=1) return r(); v.addEventListener("loadedmetadata",r,{once:true}); setTimeout(r,4000); });
  return { found:true, src:v.currentSrc||v.src, readyState:v.readyState, duration:Math.round(v.duration||0), w:v.videoWidth, h:v.videoHeight };
});
// pdf link check
const pdf = await p.evaluate(()=>{ const a=[...document.querySelectorAll("a[href*='pdf']")].map(x=>x.getAttribute("href")); return a; });
const head = await p.evaluate(()=>document.querySelector("h1")?.textContent||"");
await p.screenshot({path:"scratchpad/audit/tutorial-v3-shots/hub-local.png", fullPage:true});
console.log("H1:", head);
console.log("VIDEO:", JSON.stringify(vid));
console.log("PDF links:", JSON.stringify(pdf));
console.log("console err/warn:", msgs.length, msgs.join(" | ")||"(none)");
console.log("pageerrors/reqfail:", errs.length, errs.join(" | ")||"(none)");
await b.close(); srv.close(); process.exit(0);
