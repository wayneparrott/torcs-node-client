

import {SimAction} from './SimAction'
import {Driver} from './Driver'
import {SensorData} from './SensorData'

export class SimpleDriver extends Driver {
  readonly straightTargetSpeed: number = 150;
  readonly turnTargetSpeed: number = 50;

  private action: SimAction = new SimAction();

  curSteering: number = 0;

  control(sensors: SensorData): SimAction {

    if (sensors.damage > 50 || Math.abs(this.curSteering) > 0.9) {
      process.exit(-1);
    }

    let isStraight = this.isStraight(sensors);
    let targetSpeed = isStraight ? this.straightTargetSpeed : this.turnTargetSpeed;
    console.log('targetSpeed', targetSpeed);

    if (sensors.gear == 0) {
      this.action.gear = 1;
    }

    if (isStraight) {
      if (sensors.gear == 1 && sensors.speedX > this.turnTargetSpeed + 5) {
        this.action.gear = 2;
      } else if (sensors.gear == 2 && sensors.speedX > 100) {
        this.action.gear = 3;
      }
    } else { //on a turn
      if (sensors.gear == 3) {
        this.action.gear = sensors.speedX < 100 ? 2 : 3;
      } else if (sensors.gear == 2) {
        this.action.gear = sensors.speedX < targetSpeed + 5 ? 1 : 2;
      } else {
        this.action.gear = 1;
      }
    }

    if (sensors.speedX < targetSpeed) {
      this.action.accelerate = 0.7;
      this.action.brake = 0;
    } else {
      let deltaSpeedPercent: number = sensors.speedX / targetSpeed;
      if (deltaSpeedPercent > 1.1) {
        this.action.brake = 0.3;
      } else {
        this.action.brake = 0.0;
      }
      this.action.accelerate = 0;
    }

    //    if (sensors.speedX > 2) {
    //      if (sensors.trackPos < 0) { //right of axis
    //        this.curSteering += 0.01;      
    //      } else if (sensors.trackPos > 0) { //left of axis
    //        this.curSteering -= 0.01;
    //      }
    //      action.steering = Steering;
    //    }
    
    if (Math.abs(sensors.angle) < 0.087) {
      this.action.steering = 0; 
    } else if (sensors.angle < 0) { //moving left
      let BASE_TURN: number = -0.1;
      this.action.steering = BASE_TURN;  //turn right
      this.action.steering += sensors.angle < -0.1 ? -0.2 : 0;
      this.action.steering += sensors.angle < -0.15 ? -0.5 : 0;
      this.action.steering += sensors.angle < -0.2 ? -0.7 : 0;
      this.action.steering += sensors.angle < -0.3 ? -0.8 : 0;
    } else { //moving to right
      let BASE_TURN: number = 0.1;
      this.action.steering = BASE_TURN;   //turn left        
      this.action.steering += sensors.angle > 0.1 ? 0.2 : 0;
      this.action.steering += sensors.angle > 0.15 ? 0.5 : 0;
      this.action.steering += sensors.angle > 0.2 ? 0.7 : 0;
      this.action.steering += sensors.angle > 0.3 ? 0.8 : 0;
    }

    if (this.action.steering == 0 && Math.abs(sensors.trackPos) > 0.1) {
      if (sensors.trackPos < 0) { //car on the right
        this.action.steering = 0.1; //move to the left
      } else { //car on the left
        this.action.steering = -0.1; //move to the right
      }
    }

    return this.action;
  }

  isStraight(sensors: SensorData): boolean {
    let edgeDistances: number[] = sensors.trackEdgeSensors;
    //    let avgDistance : number = (edgeDistances[9]+edgeDistances[10]+edgeDistances[11])/3.0;
    let distance: number = Math.max(Math.max(edgeDistances[9], edgeDistances[10]), edgeDistances[11]);
    //    console.log('frontedge',edgeDistances[8],edgeDistances[9],edgeDistances[10],edgeDistances[11],edgeDistances[12]);
    console.log('frontedge', distance);
    return distance > 75;
  }

  isTurn(sensors: SensorData): boolean {
    return !this.isStraight(sensors)
  }

  reset(): void {
  }

  shutdown(): void {
  }

}
