#!/usr/bin/env node

import { SimAction } from "./SimAction";
import { Driver } from './Driver'
import { SensorData } from './SensorData';
import { SimCommunicator } from "./SimCommunicator";
import { SimListener } from './SimListener';
import { SimMessage } from './SimMessage';
import { SimMessageType } from './SimMessageType';
import { Utils } from './Utils';
import * as tty from 'tty';
import { Settings } from "./Settings";

import { PurePursuitDriver } from './drivers/PurePursuit';

// import { KeyboardDriver } from './experimental/KeyboardDriver';
// import { SCRSimpleDriver } from './drivers/SCRSimpleDriver';
// import { SimpleDriver } from './drivers/SimpleDriver';
// import { NonlinearDriver } from './drivers/NonlinearDriver';
// import { PIDDriver } from './drivers/PIDDriver';
// import { SmartDriver } from "./drivers/SmartDriver";
// import { LeftTurnDriver } from './drivers/LeftTurnDriver';

const keypress: any = require('keypress');

enum SimState {
	DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

export class TorcsClient implements SimListener {
	static TORCS_DEFAULT_DRIVER = "zirk";
	static TORCS_SIM_HOST = 'localhost';
	static TORCS_SIM_PORT = 3001;

	private simCommunicator: SimCommunicator;
	private driver: Driver;
	private processMsgsEnabled: boolean = false;

	constructor(driver = TorcsClient.TORCS_DEFAULT_DRIVER,
		host = TorcsClient.TORCS_SIM_HOST, port = TorcsClient.TORCS_SIM_PORT,
		verboseLevel = 0) {
		Settings.verboseLevel = verboseLevel;
		this.initKeys();
		this.simCommunicator = new SimCommunicator(this, host, port);

		this.driver = new PurePursuitDriver('zirk');

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
		await Utils.createDelay(1000);
		this.simCommunicator.disconnect();
		await Utils.createDelay(1000);
		this.simCommunicator =
			new SimCommunicator(this, TorcsClient.TORCS_SIM_HOST, TorcsClient.TORCS_SIM_PORT);
		this.start();
	}

	handleMessage(msg: SimMessage) {
		if (!this.handleMessage) return;
		if (msg.type != SimMessageType.DATA) return;

		let sensorData: SensorData = new SensorData(msg);
		if (Settings.verboseLevel === 1) console.log('sensors', sensorData.toString());
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
		if (Settings.verboseLevel === 2) console.log('got "keypress"', key);
		if (key.name == 'r') {    //reset
			this.restart();
		} else if (key.name == 'v') {    //toggle verbose mode
			Settings.verboseLevel = Settings.verboseLevel === 2 ? 0 : Settings.verboseLevel + 1;
		} else if (key && key.ctrl && key.name == 'c') {
			this.stop();
			process.exit();
		}
	}


};

