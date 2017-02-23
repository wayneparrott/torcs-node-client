
import { TorcsMessage } from './TorcsMessage';
import { MessageParser } from './MessageParser';
import { SensorData } from './SensorData';
import  {Action}  from "./Action";
import { Driver } from './Driver'
import { KeyboardDriver } from './KeyboardDriver'
import { SCRSimpleDriver } from './SCRSimpleDriver'
import { SimpleDriver } from './SimpleDriver'
import { WebServer } from './WebServer'

//import * as dgram from "typed-dgram";
const dgram:any = require('dgram'); 

//todo add exception handling for network errors
export class SocketHandler {
  readonly host: string;
  readonly port: number;
  private verbose: boolean;
  private socket: any; //dgram.Socket;

  private msgCnt: number = 0;
  private currentParsedMsg: TorcsMessage;
  private driver: Driver;
  private ws: WebServer;

  constructor(host: string, port: number, verbose: boolean) {
    this.driver = new SimpleDriver('zirk');
//    this.driver = new KeyboardDriver('zirk');
//    this.driver = new SCRSimpleDriver('zirk');
    this.host = host;
    this.port = port;
    this.verbose = verbose;
    this.socket = dgram.createSocket('udp4');

    this.ws = new WebServer();
    this.ws.start();
    
    this.socket.on('message',
      (message: Buffer, remote: any) => //dgram.RemoteInfo
        this.handleMessage(message, remote));
  }

  send(msg: string): void {
    if (this.verbose) console.log("Sending: ", msg);

    let buf = new Buffer(msg);
    this.socket.send(buf, 0, buf.length, this.port, this.host, function(err, bytes) {
      if (err) throw err;
    });
  }

  receive(): string {
    //wait for msg if not received yet
    return "";
  }
  
  close(): void {
    this.socket.close();
  }

  handleMessage(buffer: Buffer, remote: any): void { //dgram.RemoteInfo
    let rawMsg = buffer.toString();
    
    this.msgCnt++;
    //if (this.msgCnt < 10) {
//      console.log(remote.address + ':' + remote.port + ' - ' + rawMsg);
      let msg = MessageParser.getInstance().parse(rawMsg);
      if (msg.isInitMessage()) {
//        console.log("INITTTTT");
      } else if (msg.isDataMessage()) {
//        console.log("DATAAAAAA");
        let sensors = new SensorData(msg);
//        console.log(sensors.toString());
        let action = this.driver.control(sensors);
        this.send(action.toString());
        
        let webSensors = {speed: sensors.speedX, rpm: sensors.rpm, 
                          gear: sensors.gear, steer: action.steering, 
                          damage: sensors.damage};
        this.ws.send(JSON.stringify(webSensors));
      } else if (msg.isRestartMessage()) {
        console.log("RESETTTT");
      }
        else {
        console.log("OTHERRRRR");
      }
      
      
//      if (this.msgCnt == 5) { //restart
//        let act: Action = new Action();
//        act.restartRace = true;
//        let msg: string = act.toString();
//        console.log("RESTART - ", msg); 
//        this.send(msg);
//      }
//    }
  }
}

