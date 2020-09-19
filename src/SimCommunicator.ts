

import { SimMessage } from './SimMessage';
import { SimMessageParser } from './SimMessageParser';
import { SimAction } from './SimAction';
import { SimListener } from './SimListener';
import { Settings } from './Settings';
import { Utils } from './Utils';

const dgram: any = require('dgram');

export enum CommState {
  DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

//todo add exception handling for network errors
export class SimCommunicator {
  // static SIM_INIT =
  //   "SCR(init " +
  //   "-90.0 -75.0 -60.0 -45.0 -30.0 -20.0 -15.0 -10.0 -5.0 " +
  //   "0.0 " +
  //   "5.0 10.0 15.0 20.0 30.0 45.0 60.0 75.0 90.0)";

  private simListener: SimListener;
  readonly host: string;
  readonly port: number;
  readonly sensorConfig: number[];
  private socket: any; //dgram.Socket;
  private state = CommState.DISCONNECTED;

  private msgCnt: number = 0;
  private currentParsedMsg: SimMessage;

  private postStopAction: () => void;

  constructor(listener: SimListener, host: string, port: number, sensorConfig: Array<number>) {
    this.simListener = listener;
    this.host = host;
    this.port = port;
    this.sensorConfig = sensorConfig;
  }

  get State(): CommState {
    return this.state;
  }

  connect(): void {
    if (Settings.verboseLevel) console.log('communicator connect: ', this.state);

    this.socket = dgram.createSocket('udp4');
    this.socket.
      on('listening', () => {
        if (Settings.verboseLevel) console.log('communicator: listening event');
      }).
      on('message', (message: Buffer, remote: any) => { //dgram.RemoteInfo
        if (this.state == CommState.CONNECTING) {
          this.state = CommState.CONNECTED;
        }
        this.handleSimMessage(message, remote)
      }).
      on('close', () => {
        if (Settings.verboseLevel) console.log('communicator: close event');

        // if (this.postStopAction) {
        //     (this.postStopAction)();
        // }
      }).
      on('error', (error: Error) => {
        console.error("Sim communications error", error);
      });

    this.state = CommState.CONNECTING;
    this.initSimCommo();
  }


  disconnect(): void {
    this.close();
  }


  // send SIM_INIT string every 5 seconds until
  // sim communications is established
  protected async initSimCommo() {
    if (Settings.verboseLevel > 1) console.log('initcommo', this.state);
    if (this.state != CommState.CONNECTING) return;

    this.send(this.getInitMessage());
    await Utils.delay(2000);
    this.initSimCommo();
  }

  sendAction(action: SimAction) {
    this.send(action.toString());
  }

  protected send(msg: string): void {
    if (Settings.verboseLevel) console.log("Sending: ", msg, "\n-----------------------------");

    let buf =  Buffer.from(msg);
    this.socket.send(buf, 0, buf.length, this.port, this.host, function (err, bytes) {
      if (err) throw err;
    });
  }

  private close(): void {
    this.state != CommState.DISCONNECTED;
    this.socket.close(this.postStopAction ? this.postStopAction : null);
  }

  protected handleSimMessage(buffer: Buffer, remote: any): void { //dgram.RemoteInfo
    let rawMsg = buffer.toString();
    this.msgCnt++;

    if (Settings.verboseLevel > 1) console.log(remote.address + ':' + remote.port + ' - ' + rawMsg);

    let msg: SimMessage = SimMessageParser.getInstance().parse(rawMsg);
    this.simListener.handleMessage(msg);
  }

  //"SCR(init " +
  //   "-90.0 -75.0 -60.0 -45.0 -30.0 -20.0 -15.0 -10.0 -5.0 " +
  //   "0.0 " +
  //   "5.0 10.0 15.0 20.0 30.0 45.0 60.0 75.0 90.0)";
  protected getInitMessage(): string {
    return `SCR(init ${this.sensorConfig.join(" ")})`;
  }
}

