#!/usr/bin/env node

import { SimAction } from "./SimAction";
import { Driver } from './Driver'
import { SensorData } from './SensorData';
import { SimCommunicator } from "./SimCommunicator";
import { SimListener } from './SimListener';
import { SimMessage } from './SimMessage';
import { SimMessageType } from './SimMessageType';

import * as tty from 'tty'
import * as Utils from "./Utils";
import { Settings } from "./Settings";

//import { KeyboardDriver } from './experimental/KeyboardDriver'
import { SCRSimpleDriver } from './drivers/SCRSimpleDriver'
import { SimpleDriver } from './drivers/SimpleDriver'
import { NonlinearDriver } from './drivers/NonlinearDriver'

const keypress: any = require('keypress');

enum SimState {
    DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

export class TorcsClient implements SimListener {
    static TORCS_DEFAULT_DRIVER = "zirk";
    static TORCS_SIM_HOST = "192.168.1.63"; //"192.168.1.204"; //'localhost';
    static TORCS_SIM_PORT = 3001;

    private simCommunicator: SimCommunicator;
    private driver: Driver;
    private processMsgsEnabled: boolean = false;


    private options = {
        driver: TorcsClient.TORCS_DEFAULT_DRIVER,
        host: TorcsClient.TORCS_SIM_HOST,
        port: TorcsClient.TORCS_SIM_PORT
    };

    constructor() {
        this.processArgs({});
        this.initKeys();
        this.simCommunicator =
            new SimCommunicator(this, TorcsClient.TORCS_SIM_HOST, TorcsClient.TORCS_SIM_PORT);

        this.driver = new SimpleDriver('zirk');
        //this.driver = new SCRSimpleDriver('zirk');
        //this.driver = new NonlinearDriver('zirk');
    }

    processArgs(args: {}) {
    }


    start(): void {
        this.simCommunicator.connect();
        this.processMsgsEnabled = true;
    }

    stop(): void {
        this.simCommunicator.disconnect();
    }

    async restart() {
        this.processMsgsEnabled = false;
        let restartAction = new SimAction();
        restartAction.restartRace = true;
        this.simCommunicator.sendAction(restartAction);
        await Utils.wait(1000);
        this.simCommunicator.disconnect();
        await Utils.wait(1000);
        this.simCommunicator =
            new SimCommunicator(this, TorcsClient.TORCS_SIM_HOST, TorcsClient.TORCS_SIM_PORT);
        this.start();
    }

    handleMessage(msg: SimMessage) {
        if (!this.handleMessage) return;
        if (msg.type != SimMessageType.DATA) return;

        let sensorData: SensorData = new SensorData(msg);
         if (Settings.verbose) console.log('sensors',sensorData.toString());
        if (sensorData.damage > 50) { //|| Math.abs(action.curSteering) > 0.9) {
            console.log("Max Damage Exceeded", sensorData.damage);
            process.exit(-1);
            return;
        }
        let action: SimAction = this.driver.control(sensorData);

        this.simCommunicator.sendAction(action);
    }

    initKeys(): void {
        keypress(process.stdin);
        process.stdin.on('keypress',
            (ch: string, key: Object) => this.processKeys(ch, key));

        //process.stdin.setRawMode(true);
        if (tty.isatty(1)) {
            //console.log('tty');
            let readStream: tty.ReadStream = <tty.ReadStream>process.stdin;
            readStream.setRawMode(true);
        }

        process.stdin.resume();
    }

    processKeys(ch: string, key: any): void {
        if (Settings.verbose) console.log('got "keypress"', key);
        if (key.name == 'r') {    //reset
            this.restart();
        } else if (key.name == 'v') {    //toggle verbose mode
            Settings.verbose = !Settings.verbose;
        } else if (key && key.ctrl && key.name == 'c') {
            this.stop();
            process.exit();
        }
    }


};

let client = new TorcsClient();
client.start();


//    this.driver = new SimpleDriver('zirk');
//    this.driver = new KeyboardDriver('zirk');
//    this.driver = new SCRSimpleDriver('zirk');


