

import { SimAction } from '../SimAction'
import { Driver } from '../Driver'
import { SensorData } from '../SensorData'



export class NonlinearDriver extends Driver {
  static readonly MAX_TRACTION_THRESHOLD = 5.0;
  static readonly MAX_RPM = 8000;
  static readonly MAX_GEAR = 6;

  readonly straightTargetSpeed: number = 150;
  readonly turnTargetSpeed: number = 50;
  
  curSteering: number = 0;
  curThrottle: number = 0;


  control(sensors: SensorData): SimAction {

    let action = new SimAction();
    this.computeSteering(sensors,action);
    this.computeBraking(sensors,action);
    this.computeThrottleAndGear(sensors,action);

    this.control1(sensors,action);

    return action;
  }

  computeSteering(sensors: SensorData, action: SimAction) {

  }

  computeBraking(sensors: SensorData, action: SimAction) {

  }

  computeThrottleAndGear(sensors: SensorData, action: SimAction) {
    action.gear = Math.min(1, sensors.gear);
    

    console.log('wheel spin: ', sensors.wheelSpinVelocity);
  }

  reset(): void {

  }

  shutdown(): void {

  }

  // Determine if the front and back wheels are spinning at approx the same angular velocity
  wheelsHaveTraction(sensors: SensorData): boolean {
    let spin = 
      ((sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) -  // sum of rear wheel velocities
       (sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]))   // sum of front wheel velocities 
      < NonlinearDriver.MAX_TRACTION_THRESHOLD;
    return spin;
  }

  isStraight(sensors: SensorData): boolean {
    let edgeDistances: number[] = sensors.trackEdgeSensors;
    //    let avgDistance : number = (edgeDistances[9]+edgeDistances[10]+edgeDistances[11])/3.0;
    let distance: number = Math.max(edgeDistances[9], edgeDistances[10], edgeDistances[11]);
    //    console.log('frontedge',edgeDistances[8],edgeDistances[9],edgeDistances[10],edgeDistances[11],edgeDistances[12]);
    console.log('frontedge', distance);
    return distance > 75;
  }

  isTurn(sensors: SensorData): boolean {
    return !this.isStraight(sensors)
  }


  control1(sensors: SensorData, action: SimAction) {

    // if (sensors.damage > 50 || Math.abs(this.curSteering) > 0.9) {
    //   process.exit(-1);
    // }

    let isStraight = this.isStraight(sensors);
    let targetSpeed = isStraight ? this.straightTargetSpeed : this.turnTargetSpeed;
    console.log('targetSpeed', targetSpeed);

    if (sensors.gear == 0) {
      action.gear = 1;
    }

    if (isStraight) {
      if (sensors.gear == 1 && sensors.speedX > this.turnTargetSpeed + 5) {
        action.gear = 2;
      } else if (sensors.gear == 2 && sensors.speedX > 100) {
        action.gear = 3;
      }
    } else { //on a turn
      if (sensors.gear == 3) {
        action.gear = sensors.speedX < 100 ? 2 : 3;
      } else if (sensors.gear == 2) {
        action.gear = sensors.speedX < targetSpeed + 5 ? 1 : 2;
      } else {
        action.gear = 1;
      }
    }

    if (sensors.speedX < targetSpeed) {
      action.accelerate = 0.5;
      action.brake = 0;
    } else {
      let deltaSpeedPercent: number = sensors.speedX / targetSpeed;
      if (deltaSpeedPercent > 1.1) {
        action.brake = 0.3;
      } else {
        action.brake = 0.0;
      }
      action.accelerate = 0;
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
      action.steering = 0;
    } else if (sensors.angle < 0) { //moving left
      let BASE_TURN: number = -0.1;
      action.steering = BASE_TURN;  //turn right
      action.steering += sensors.angle < -0.1 ? -0.2 : 0;
      action.steering += sensors.angle < -0.15 ? -0.5 : 0;
      action.steering += sensors.angle < -0.2 ? -0.7 : 0;
      action.steering += sensors.angle < -0.3 ? -0.8 : 0;
    } else { //moving to right
      let BASE_TURN: number = 0.1;
      action.steering = BASE_TURN;   //turn left        
      action.steering += sensors.angle > 0.1 ? 0.2 : 0;
      action.steering += sensors.angle > 0.15 ? 0.5 : 0;
      action.steering += sensors.angle > 0.2 ? 0.7 : 0;
      action.steering += sensors.angle > 0.3 ? 0.8 : 0;
    }

    if (action.steering == 0 && Math.abs(sensors.trackPos) > 0.1) {
      if (sensors.trackPos < 0) { //car on the right
        action.steering = 0.1; //move to the left
      } else { //car on the left
        action.steering = -0.1; //move to the right
      }
    }

    if (action.accelerate - this.curThrottle > 0.1) {
      action.accelerate = Math.max(this.curThrottle + 0.05, 1.0);
    }

    if (!this.wheelsHaveTraction(sensors) && action.accelerate > 0.0) {
      console.log("WHEEL SPINNNNNN");
      let throttle = Math.min(action.accelerate,this.curThrottle);
      action.accelerate = Math.max(throttle-0.2, 0.0);
    }


    this.curThrottle = action.accelerate;

    return action;
  }
}
