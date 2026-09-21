param([int]$Port = 4173, [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
# TcpListener keeps this preview local and does not require a URL reservation or admin rights.
# This is a small preview server, not an internet-facing production server.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Collections.Generic;
using System.Text.RegularExpressions;
public static class AuradioPreview {
  public static TcpListener Listener;
  static string Root;
  public static int Start(string root, int firstPort) {
    Root = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
    for(int p=firstPort;p<firstPort+11 && p<=65535;p++) {
      try { Listener=new TcpListener(IPAddress.Loopback,p);Listener.Start();
        Thread thread=new Thread(Accept);thread.IsBackground=true;thread.Start();return ((IPEndPoint)Listener.LocalEndpoint).Port;
      } catch(SocketException) { if(Listener!=null)Listener.Stop(); }
    }
    throw new IOException("No free local port. Retry with -Port 4200.");
  }
  static void Accept() {
    while(Listener!=null) {
      try { TcpClient client=Listener.AcceptTcpClient();ThreadPool.QueueUserWorkItem(delegate(object state){Serve((TcpClient)state);},client); }
      catch { break; }
    }
  }
  static void Header(Stream stream,int status,string type,long length,string extra) {
    string reason=status==200?"OK":status==206?"Partial Content":status==302?"Found":status==404?"Not Found":status==416?"Range Not Satisfiable":"Error";
    byte[] data=Encoding.ASCII.GetBytes("HTTP/1.1 "+status+" "+reason+"\r\nContent-Type: "+type+"\r\nContent-Length: "+length+"\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nAccept-Ranges: bytes\r\n"+extra+"\r\n");
    stream.Write(data,0,data.Length);
  }
  static string Mime(string file) {
    switch(Path.GetExtension(file).ToLowerInvariant()) {
      case ".html":return "text/html; charset=utf-8";
      case ".css":return "text/css; charset=utf-8";
      case ".js":case ".mjs":return "text/javascript; charset=utf-8";
      case ".svg":return "image/svg+xml";
      case ".png":return "image/png";
      case ".wav":return "audio/wav";
      case ".json":return "application/json; charset=utf-8";
      case ".xml":return "application/xml; charset=utf-8";
      case ".txt":return "text/plain; charset=utf-8";
      default:return "application/octet-stream";
    }
  }
  static void Serve(TcpClient client) {
    using(client) {
      try {
        client.ReceiveTimeout=5000;client.SendTimeout=5000;
        using(NetworkStream stream=client.GetStream()) {
          // Limit request headers, close every connection, never evaluate submitted content.
          MemoryStream request=new MemoryStream();int previous=0,matched=0;
          while(request.Length<16384) {
            int next=stream.ReadByte();if(next<0)return;request.WriteByte((byte)next);
            if((matched==0||matched==2)&&next==13)matched++;
            else if((matched==1||matched==3)&&next==10)matched++;
            else matched=next==13?1:0;
            previous=next;if(matched==4)break;
          }
          if(matched!=4){Header(stream,400,"text/plain",0,"");return;}
          string[] lines=Encoding.ASCII.GetString(request.ToArray()).Split(new string[]{"\r\n"},StringSplitOptions.None);
          string[] first=lines[0].Split(' ');if(first.Length<3)return;
          bool head=first[0]=="HEAD";
          if(first[0]!="GET"&&!head){Header(stream,405,"text/plain",0,"Allow: GET, HEAD\r\n");return;}
          string host="",range="";
          foreach(string line in lines){int colon=line.IndexOf(':');if(colon<0)continue;string key=line.Substring(0,colon).ToLowerInvariant();if(key=="host")host=line.Substring(colon+1).Trim();if(key=="range")range=line.Substring(colon+1).Trim();}
          if(!Regex.IsMatch(host,@"^(127\.0\.0\.1|localhost)(:\d+)?$")){Header(stream,403,"text/plain",0,"");return;}
          string path=Uri.UnescapeDataString(first[1].Split('?')[0]);
          if(path=="/auradio_web"){Header(stream,302,"text/plain",0,"Location: /auradio_web/\r\n");return;}
          if(!path.StartsWith("/",StringComparison.Ordinal)||path.IndexOf('\\')>=0||path.IndexOf('\0')>=0){Header(stream,404,"text/plain",0,"");return;}
          string relative=path.StartsWith("/auradio_web/",StringComparison.Ordinal)?path.Substring(13):path.Substring(1);
          foreach(string part in relative.Split('/'))if(part.StartsWith(".")){Header(stream,404,"text/plain",0,"");return;}
          string file=Path.GetFullPath(Path.Combine(Root,relative.Replace('/',Path.DirectorySeparatorChar)));
          if(!file.StartsWith(Root,StringComparison.OrdinalIgnoreCase)&&file+Path.DirectorySeparatorChar!=Root){Header(stream,404,"text/plain",0,"");return;}
          if(Directory.Exists(file)) {
            if(!path.EndsWith("/")){Header(stream,302,"text/plain",0,"Location: "+path+"/\r\n");return;}
            file=Path.Combine(file,"index.html");
          }
          int status=200;if(!File.Exists(file)){file=Path.Combine(Root,"404.html");status=404;}
          if(!File.Exists(file)){Header(stream,404,"text/plain",0,"");return;}
          using(FileStream input=File.OpenRead(file)) {
            long size=input.Length,start=0,end=size-1;
            if(range!=""&&status==200) {
              Match m=Regex.Match(range,@"^bytes=(\d*)-(\d*)$");
              bool valid=m.Success&&(m.Groups[1].Value!=""||m.Groups[2].Value!="");
              long left=0,right=0;
              if(valid&&m.Groups[1].Value!="")valid=long.TryParse(m.Groups[1].Value,out left);
              if(valid&&m.Groups[2].Value!="")valid=long.TryParse(m.Groups[2].Value,out right);
              if(valid){start=m.Groups[1].Value!=""?left:Math.Max(0,size-right);end=m.Groups[1].Value!=""&&m.Groups[2].Value!=""?Math.Min(size-1,right):size-1;valid=start>=0&&start<=end&&end<size;}
              if(!valid){Header(stream,416,"text/plain",0,"Content-Range: bytes */"+size+"\r\n");return;}status=206;
            }
            Header(stream,status,Mime(file),Math.Max(0,end-start+1),status==206?"Content-Range: bytes "+start+"-"+end+"/"+size+"\r\n":"");
            if(head)return;
            input.Seek(start,SeekOrigin.Begin);byte[] chunk=new byte[65536];long remaining=end-start+1;
            while(remaining>0){int n=input.Read(chunk,0,(int)Math.Min(chunk.Length,remaining));if(n==0)break;stream.Write(chunk,0,n);remaining-=n;}
          }
        }
      }catch(IOException){}catch(SocketException){}catch(Exception){}
    }
  }
  public static void Stop(){if(Listener!=null){Listener.Stop();Listener=null;}}
}
'@
$ActualPort = [AuradioPreview]::Start((Join-Path $PSScriptRoot 'dist'), $Port)
$Url = "http://127.0.0.1:$ActualPort/"
Write-Host "Auradio website: $Url"
Write-Host 'Keep this window open. Ctrl+C to stop. Local preview only.'
if (-not $NoOpen) { Start-Process $Url }
try { while ($true) { Start-Sleep -Seconds 1 } } finally { [AuradioPreview]::Stop() }
