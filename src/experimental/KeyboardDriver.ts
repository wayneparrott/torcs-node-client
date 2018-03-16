
import { SimAction } from '../SimAction'
import { Driver } from '../Driver'
import { SensorData } from '../SensorData'
import * as tty from 'tty'

//import * as keyppress from 'Keypress'
const keypress: any = require('keypress');

export class KeyboardDriver extends Driver {
  static STEERING_STEP: number = 0.05;
  static ACCEL_STEP: number = 0.025;
  
  keySteering: number = 0.0;
  keyAccel: number = 0.0;
  keyBrake: number = 0.0;
  keyGear: number = 0;
  keyRestart: boolean = false;
  
  constructor(driverId:string) {
    super(driverId);
    this.initKeys();
  }
  
  initKeys(): void{ 
    keypress(process.stdin);
    process.stdin.on('keypress', 
                    (ch: string, key: Object)=>this.processKeys(ch,key));
   
    //process.stdin.setRawMode(true);
    if (tty.isatty(1)) {
      //console.log('tty');
      let readStream: tty.ReadStream = <tty.ReadStream>process.stdin;
      readStream.setRawMode(true);
    }
    
    process.stdin.resume();
  }
  
  processKeys(ch: string, key: any): void {
    console.log('got "keypress"',key);
    switch(key.name) {
      case 'a': //turn left
      case 'left': 
        this.keySteering = Math.max (-1, Math.min (1, this.keySteering + KeyboardDriver.STEERING_STEP));
        break;
      case 'd': //turn right
      case 'right':
        this.keySteering = Math.max (-1, Math.min (1, this.keySteering - KeyboardDriver.STEERING_STEP));
        break;
      case 'w': //accelerate & remove brakes
        this.keyAccel = Math.max (0, Math.min (1, this.keyAccel + KeyboardDriver.ACCEL_STEP))
        this.keyBrake = Math.max (0, Math.min (1, this.keyBrake - KeyboardDriver.ACCEL_STEP))
        break;
      case 's': //brake & decelerate
//      case 'space':
        this.keyAccel = Math.max (0, Math.min (1, this.keyAccel - KeyboardDriver.ACCEL_STEP))
        this.keyBrake = Math.max (0, Math.min (1, this.keyBrake + KeyboardDriver.ACCEL_STEP))
        break;
      case 'up': //up shift
      case 'space':
        //this.keyGear = Math.max (-1, Math.min (6, ++this.keyGear));
        this.keyAccel = 1.0;
        break;
      case 'down': //down shift
        //this.keyGear = Math.max (-1, Math.min (6, --this.keyGear));
        this.keyBrake = 0.5;
        break;
      case 'f': //up shift
        this.keyGear = Math.max (-1, Math.min (6, ++this.keyGear));
        break;
      case 'g': //down shift
        this.keyGear = Math.max (-1, Math.min (6, --this.keyGear));
        break;      
      case 'r': //reset
        this.keyRestart = true
        break;
    }
      
    if (key && key.ctrl && key.name == 'c') {
        process.exit();
    }
  }
  
  control(sensors: SensorData): SimAction {
    let action : SimAction = new SimAction();
    action.steering = this.keySteering;
    action.accelerate = this.keyAccel;
    action.brake = this.keyBrake;
    action.gear = this.keyGear;
    action.restartRace = this.keyRestart;
    
    this.keyRestart = false;
    this.keyAccel = 0.0;
    this.keyBrake = 0.0;
    
    return action;
  }
  
  shutdown(): void {
  }
  
  reset(): void {
  }
}