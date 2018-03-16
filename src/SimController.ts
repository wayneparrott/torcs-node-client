
import * as fs from 'fs';
import * as ChildProcess from 'child_process';
import * as os from 'os';

import { SimMessage } from './SimMessage';
import { SimMessageParser } from './SimMessageParser';
import { SensorData } from './SensorData';
import { SimAction } from './SimAction';
import { SimListener } from './SimListener';


//import * as dgram from "typed-dgram";
const dgram: any = require('dgram');



// start sim
// send sim
// 
//todo add exception handling for network errors
export class SimController {
    static SIM_INIT =
    "SCR(init " +
    "-90.0 -75.0 -60.0 -45.0 -30.0 -20.0 -15.0 -10.0 -5.0 " +
    "0.0 " +
    "5.0 10.0 15.0 20.0 30.0 45.0 60.0 75.0 90.0)";

    private simListener: SimListener;
    readonly host: string;
    readonly port: number;
    private verbose: boolean;
    private socket: any; //dgram.Socket;
    private simProc: ChildProcess.ChildProcess;
    private _isRunning: boolean;
    private _isSimCommoInited: boolean;

    private msgCnt: number = 0;
    private currentParsedMsg: SimMessage;

    constructor(listener: SimListener, host: string, port: number, options?: SimOptions) {
        this.simListener = listener;
        this.host = host;
        this.port = port;
        this.verbose = true; //options && options.verbose;
    }

    start(): void {
        if (this.isRunning()) {
            return;
        }

        this._isRunning = true;
        
        this.socket = dgram.createSocket('udp4');
        this.socket.on('message',
            (message: Buffer, remote: any) => //dgram.RemoteInfo
                this.handleSimMessage(message, remote));


        //launch process
        //connect with process & init sim
        
        // let simp = process.exec('cmd /c "cd /d c:\\dev\\sim\\torcs && wtorcs.exe"' );
        //let simp = process.spawn('cmd /c "cd /d c:\\dev\\sim\\torcs && wtorcs.exe -r race_config.xml"' );
        let options: ChildProcess.SpawnOptions = {
            cwd: "c:\\dev\\sim\\torcs",
            shell: true
            //, stdio: 'inherit'
        }
        let args = ['-r', 'race_config.xml'];
        args = [];
        this.simProc = ChildProcess.spawn('wtorcs.exe', args, options);

        this.simProc.stdout.on('data', function(data) {
            console.log('stdout: ' + data);
        });

        this.simProc.stderr.on('data', function(data) {
            console.log('stderr: ' + data);
        });

        this.simProc.on('close', function(code) {
            console.log('child process exited with code ' + code);
        });

        this.initSimCommo();
    }
    

    stop(): void {
        this.close();
        
        var isWin = /^win/.test(process.platform);
        if (!isWin) {
            this.simProc.kill();
        } else {
            ChildProcess.exec('taskkill /PID ' + this.simProc.pid + ' /T /F');
        }
    }

    // send SIM_INIT string every 5 seconds until
    // sim communications is established
    protected initSimCommo(): void {
        if (this._isSimCommoInited) return;
        
        this.send(SimController.SIM_INIT);
        setTimeout( ()=>{this.initSimCommo()}, 5000);
    }
    
    isRunning(): boolean {
        return this._isRunning;
    }

    sendAction(action: SimAction) {
        this.send(action.toString());
    }
        
    protected send(msg: string): void {
        if (this.verbose) console.log("Sending: ", msg);

        let buf = new Buffer(msg);
        this.socket.send(buf, 0, buf.length, this.port, this.host, function(err, bytes) {
            if (err) throw err;
        });
    }

    private receive(): string {
        //wait for msg if not received yet
        return "";
    }

    private close(): void {
        this.socket.close();
    }

    handleSimMessage(buffer: Buffer, remote: any): void { //dgram.RemoteInfo
        this._isSimCommoInited = true;
        let rawMsg = buffer.toString();

        this.msgCnt++;
       // if (this.msgCnt < 10) {
            console.log(remote.address + ':' + remote.port + ' - ' + rawMsg);
        //}

        let msg: SimMessage = SimMessageParser.getInstance().parse(rawMsg);
        this.simListener.handleMessage(msg);

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

