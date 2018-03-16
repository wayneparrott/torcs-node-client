
//import * as WebServer from 'ws';
const WebSocketServer: any = require('ws').Server;
const path: any = require('path');
const httpServer: any = require('http-server');

export class WebServer {
  
  static readonly PORT : number = 8086;
  
  server: any; //httpServer
  wss : any; //WebSocketServer
  ws : any; //websocket connection
  hasWSConnection: boolean = false;
  
  start(port = WebServer.PORT) : boolean {
    let root = path.join(__dirname,'..','www');
    this.server = httpServer.createServer({
            root: root,
            robots: true,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': 'true'
            }
           });
    this.server.listen(port);

    this.ws = new WebSocketServer({server: this.server.server});
    this.ws.on('connection', (ws:any)=>{this.ws=ws; this.hasWSConnection=true});
//    this.wss.on('close', ()=>{
//      this.hasWSConnection=false;
//      this.ws = null});

    return true;
  }
  
  send(msg: string): void {
    if (!this.hasWSConnection) return;
    
    //console.log(this.ws);
    this.ws.send(msg);
  }
  
}

//testing
//let sock = new WebServer();
//sock.start();
//setInterval(()=>sock.send( Math.random() ), 1000);
