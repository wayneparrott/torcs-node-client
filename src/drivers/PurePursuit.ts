
import { SimAction } from '../SimAction';
import { Driver } from '../Driver';
import { SensorData } from '../SensorData';
import * as Controller from 'node-pid-controller';
import { Utils } from '../Utils';
import { Settings } from '../Settings';

const createMovingAvg = require('live-moving-average');


const RAD_PER_DEG = Math.PI / 180.0;
const DEG_PER_RAD = 1.0 / RAD_PER_DEG;

const DEFAULT_MIN_SPEED = 50;
const DEFAULT_MAX_SPEED = 250;

const GEAR_MAX = 6;
const RPM_MAX = 9200;
const ACCEL_MAX = 1.0;
const ACCEL_DELTA = 0.1;

const BRAKING_MAX = -0.5;
const BRAKING_DELTA = 0.05;
const WHEELSPIN_ACCEL_DELTA = 0.025;
const WHEELSPIN_MAX = 5.0; // greater than this value --> loss of control

const PURE_PURSUIT_K = 0.35;
const PURE_PURSUIT_L = 2.4;
const PURE_PURSUIT_2L = 2 * PURE_PURSUIT_L;
const MAX_STEERING_ANGLE_DEG = 25; // degrees
const USE_STEERING_FILTER = false;
const STEERING_FILTER_SIZE = 5;

const EDGE_AVOIDANCE_ENABLED = false;
const EDGE_MAX_TRACK_POS = 0.8;
const EDGE_STEERING_INPUT = 0.05;



const SPEED_PID: Controller.Options = {
  k_p: 0.2,
  k_i: 0,
  k_d: 0 //5
};


export class PurePursuitDriver extends Driver {

  private speedController: Controller;
  private curAccel = 0;
  private steeringCmdFilter = USE_STEERING_FILTER ? createMovingAvg(STEERING_FILTER_SIZE, 0) : null;

  constructor(name: string) {
    super(name);

    this.speedController = new Controller(SPEED_PID);
    this.speedController.setTarget(0);

    this.curAccel = 0;
  }

  control(sensors: SensorData): SimAction {
    let action = new SimAction();
    this.computeSteering(sensors, action);
    this.computeSpeed(sensors, action);

    return action;
  }


  // * steer towards longest distance measure
  // * greater tgt angle -> increased turn angle
  // * increased turn angle -> slower tgt speed
  // 
  // todo: account for vehicle angle to track, currently assume parallel with track centerline
  computeSteering(sensors: SensorData, action: SimAction): void {

    let maxDistanceAngle = sensors.maxDistanceAngle;
    let maxDistanceAngleRad = maxDistanceAngle * RAD_PER_DEG;

    if (Settings.verboseLevel) {
      console.log('maxDSensor', sensors.maxDistanceSensor, 'maxDAngle', maxDistanceAngle, 'maxDist', sensors.maxDistance);
    }

    // alpha (a) = angle of longest sensor (... -20, -10, 0, 10, 20, ...)
    let rawSteeringAngleRad = Math.atan(
      PURE_PURSUIT_2L * Math.sin(maxDistanceAngleRad) /
      (PURE_PURSUIT_K * sensors.speedX));
    let rawSteeringAngleDeg = -rawSteeringAngleRad * DEG_PER_RAD;

    // normalize between[-1,1]
    let normalizedSteeringAngle = Utils.clamp(rawSteeringAngleDeg / MAX_STEERING_ANGLE_DEG, -1.0, 1.0);

    if (USE_STEERING_FILTER) {
      this.steeringCmdFilter.push(normalizedSteeringAngle);
      action.steering = this.steeringCmdFilter.get();
    } else {
      action.steering = normalizedSteeringAngle;
    }

    // On straight segments, correct for vehicle drift near edge of track 
    if (EDGE_AVOIDANCE_ENABLED) {
      let edgeSteeringCorrection = 0;

      if (sensors.trackPos > EDGE_MAX_TRACK_POS && sensors.angle < 0.005) {
        edgeSteeringCorrection = -EDGE_STEERING_INPUT;
      } else if (sensors.trackPos < EDGE_MAX_TRACK_POS && sensors.angle > 0.005) {
        edgeSteeringCorrection = EDGE_STEERING_INPUT;
      }

      action.steering += edgeSteeringCorrection;

      if (Settings.verboseLevel == 1 && edgeSteeringCorrection != 0) {
        if (edgeSteeringCorrection < 0) console.log('EDGE AVOIDANCE APPLIED - PUSH RIGHT');
        else console.log('EDGE AVOIDANCE APPLIED - PUSH LEFT');
      }
    }

    if (Settings.verboseLevel) {
      console.log('steering - trkpos: ', sensors.trackPos.toFixed(3), 'rawSteerAngle: ',
        rawSteeringAngleDeg.toFixed(3), 'steer: ', action.steering.toFixed(3),
        'yaw: ', sensors.angle
      );
    }
  }

  computeSpeed(sensors: SensorData, action: SimAction): void {
    let accel = 0;
    let gear = sensors.gear;
    let brakeZone = sensors.speedX / 1.5;

    let targetSpeed = sensors.maxDistance < brakeZone ? Math.max(DEFAULT_MIN_SPEED, sensors.maxDistance) : DEFAULT_MAX_SPEED;

    // detect wheel spin
    let frontWheelAvgSpeed = (sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]) / 2.0;
    let rearWheelAvgSpeed = (sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) / 2.0;
    let slippagePercent = frontWheelAvgSpeed / rearWheelAvgSpeed * 100.0;

    let wheelSpinDelta =
      Math.abs(
        ((sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]) / 2) -
        ((sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) / 2));

    if (Settings.verboseLevel) {
      console.log('Wheel rotation: ', sensors.wheelSpinVelocity);
    }

    let hasWheelSpin = sensors.speedX > 5.0 && slippagePercent < 80.0;
    if (hasWheelSpin) { // excessive wheelspin preempts normal accel/decel calc
      if (Settings.verboseLevel == 1) console.log('WHEEL SPIN: ', wheelSpinDelta, slippagePercent);
      accel = this.curAccel -= WHEELSPIN_ACCEL_DELTA;
    } else {
      this.speedController.setTarget(targetSpeed);
      accel = this.speedController.update(sensors.speedX);
      if (Settings.verboseLevel == 1) {
        console.log('PID: ', accel, sensors.speedX);
      }
    }

    if (accel > 0) { // on the gas
      accel = Utils.clamp(accel, 0.0, this.curAccel + ACCEL_DELTA);
      if (sensors.gear === 0 || sensors.rpm > RPM_MAX) {
        gear++;
      }
    }
    else if (accel < 0) { // on the brakes
      accel = Utils.clamp(accel, this.curAccel - BRAKING_DELTA, 0.0);

      if (sensors.rpm < RPM_MAX * 0.75) {
        gear--;
      }
    }

    action.gear = Utils.clamp(gear, 1, GEAR_MAX);

    accel = Utils.clamp(accel, BRAKING_MAX, ACCEL_MAX);
    this.curAccel = accel;
    action.accelerate = accel > 0.0 ? accel : 0.0;
    action.brake = accel < 0.0 ? Math.abs(accel) : 0.0;

    if (Settings.verboseLevel) {
      console.log('dist: ', Math.trunc(sensors.maxDistance), 'tgtspeed:', Math.trunc(targetSpeed),
        'accel:', accel.toFixed(3), 'gear:', action.gear);
    }
  }

}




