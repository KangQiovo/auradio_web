/** Local-only preview for the already built website. Uses Node built-ins, no npm install. */
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const project=dirname(fileURLToPath(import.meta.url));
const prefix='/';
const legacyPrefix='/auradio_web/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.ico':'image/x-icon'};
export function parseRange(value,size){
  if(!value)return null;
  const m=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!m||(!m[1]&&!m[2])||!size)return false;
  let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
  let end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;
  return {start,end};
}
export function resolvePublicPath(raw,root=resolve(project,'dist')){
  let path;
  try{path=decodeURIComponent(raw.split('?')[0]);}catch{return null;}
  if(!path.startsWith(prefix)||/[\\\0]/.test(path))return null;
  const parts=path.slice(path.startsWith(legacyPrefix)?legacyPrefix.length:prefix.length).split('/');
  if(['src','scripts','tests','node_modules','docs','package.json','package-lock.json'].includes(parts[0]))return null;
  if(parts.some(p=>p.startsWith('.')))return null;
  const full=resolve(root,...parts);
  return full===root||full.startsWith(root+sep)?full:null;
}
export function createPreviewServer({root=resolve(project,'dist')}={}){
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
    if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403);return res.end();}
    const path=req.url.split('?')[0];
    if(path==='/auradio_web'){res.writeHead(302,{Location:legacyPrefix});return res.end();}
    let file=resolvePublicPath(req.url,root),status=200;
    if(!file){res.writeHead(404);return res.end('Not found');}
    try{
      let info=await stat(file);
      if(info.isDirectory()){
        if(!path.endsWith('/')){res.writeHead(302,{Location:path+'/'});return res.end();}
        file=resolve(file,'index.html');info=await stat(file);
      }
      const actual=await realpath(file),actualRoot=await realpath(root);
      if(!actual.startsWith(actualRoot+sep)||!info.isFile())throw Error('Outside public root');
    }catch{file=resolve(root,'404.html');status=404;}
    try{
      const info=await stat(file);
      const range=status===200?parseRange(req.headers.range,info.size):null;
      if(range===false){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}
      const start=range?range.start:0,end=range?range.end:info.size-1;
      const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':String(range?end-start+1:info.size),'Accept-Ranges':'bytes'};
      if(range)headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
      res.writeHead(range?206:status,headers);
      if(req.method==='HEAD'||!info.size)return res.end();
      const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
      res.on('close',()=>stream.destroy());
    }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Built website missing. Run npm run build, or extract the complete package.');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const index=process.argv.indexOf('--port');let port=index>=0?Number(process.argv[index+1]):4173;
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Port must be 0-65535');
  const server=createPreviewServer();let attempts=0;
  server.on('error',error=>{
    if(error.code==='EADDRINUSE'&&index<0&&attempts++<10){server.listen(++port,'127.0.0.1');return;}
    console.error('Could not start preview:',error.message);process.exitCode=1;
  });
  server.listen(port,'127.0.0.1',()=>{
    const url=`http://127.0.0.1:${server.address().port}${prefix}`;
    console.log(`Auradio website: ${url}\nLocal preview only. Keep this window open. Ctrl+C to stop.`);
    if(process.argv.includes('--open')){
      const [cmd,args]=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
      const child=spawn(cmd,args,{stdio:'ignore'});child.on('error',()=>{});child.unref();
    }
  });
  process.on('SIGINT',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
}
