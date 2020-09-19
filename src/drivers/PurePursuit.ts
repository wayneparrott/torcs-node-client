
import { SimAction } from '../SimAction';
import { Driver } from '../Driver';
import { SensorData } from '../SensorData';
import * as Controller from 'node-pid-controller';
import { Utils } from '../Utils';
import { Settings } from '../Settings';

const createMovingAvg = require('live-moving-average');


const PI_HALF = Math.PI / 2.0; // 90 deg
const PI_FOURTHS = Math.PI / 4.0; // 45 deg
const RAD_PER_DEG = Math.PI / 180.0;
const DEG_PER_RAD = 1.0 / RAD_PER_DEG;

const DEFAULT_MIN_SPEED = 50;
const DEFAULT_MAX_SPEED = 250;

const GEAR_MAX = 6;      //
const RPM_MAX = 9500;    //
const ACCEL_MAX = 1.0;   // 
const ACCEL_DELTA = 0.5; // maximum rate of change in acceleration signal, avoid spinning out

const BRAKING_MAX = -0.5;   // braking signal <= BRAKING_MAX 
const BRAKING_DELTA = 0.05; // dampen braking to avoid lockup, max rate of chage in braking
const WHEELSPIN_ACCEL_DELTA = 0.025;
const WHEELSPIN_MAX = 5.0; // greater than this value --> loss of control

const PURE_PURSUIT_K = 0.35; // bias - increase to reduces steering sensitivity 
const PURE_PURSUIT_L = 2.4;  // approx vehicle wheelbase
const PURE_PURSUIT_2L = 2 * PURE_PURSUIT_L;
const MAX_STEERING_ANGLE_DEG = 21; // steering lock
const USE_STEERING_FILTER = false; // 
const STEERING_FILTER_SIZE = 5;    //

const EDGE_AVOIDANCE_ENABLED = true;
const EDGE_MAX_TRACK_POS = 0.85; // track edge limit
const EDGE_STEERING_INPUT = 0.0075; // slightly steer away from edge

const STALLED_TIMEOUT = 5; // # seconds of no significant movement

// TODO: implement mode for when vehicle is off track, e.g., a spin or missed turn

const LEFT_SIDE = 1;
const RIGHT_SIDE = -1;
const MIDDLE = 0;
const Q1 = 1;
const Q2 = 2;
const Q3 = 3;
const Q4 = 4;
const OFF_TRACK_TARGET_SPEED = 20;

const SPEED_PID: Controller.Options = {
  k_p: 0.2,
  k_i: 0,
  k_d: 0 //5
};


export class PurePursuitDriver extends Driver {

  private speedController: Controller;
  private curAccel = 0;
  private steeringCmdFilter: any;
  private speedMonitor: any;

  constructor(name: string) {
    super(name);
    this.init();
  }

  protected init() {
    this.speedController = new Controller(SPEED_PID);
    this.speedController.setTarget(0);
    this.curAccel = 0;
    this.steeringCmdFilter = USE_STEERING_FILTER ? createMovingAvg(STEERING_FILTER_SIZE, 0) : null;
    this.speedMonitor = createMovingAvg(STALLED_TIMEOUT * 50, 100);
  }

  restart(): void {
    this.init();
  }

  control(sensors: SensorData): SimAction {
    let action = new SimAction();
    if (this.isStalled(sensors)) {
      action.restartRace = true;
    } else {
      this.computeSteering(sensors, action);
      this.computeSpeed(sensors, action);
    }
    return action;
  }


  // * steer towards longest distance measure
  // * greater tgt angle -> increased turn angle
  // * increased turn angle -> slower tgt speed
  // 
  // todo: account for vehicle angle to track, currently assume parallel with track centerline
  computeSteering(sensors: SensorData, action: SimAction): void {
    //let rawSteerAngle = 0;

    let targetAngle = sensors.maxDistanceAngle;
    let targetAngleRad = targetAngle * RAD_PER_DEG;

    if (sensors.isOffTrack()) {
      targetAngleRad = this.computeRecoveryTargetAngle(sensors);
      if (Settings.verboseLevel) {
        console.log('offtrack: left, targetAngleDeg: ', targetAngleRad * DEG_PER_RAD);
      }
    }

    if (Settings.verboseLevel) {
      console.log('maxDSensor', sensors.maxDistanceSensor, 'maxDAngle', targetAngle, 'maxDist', sensors.maxDistance);
    }

    // alpha (a) = angle of longest sensor (... -20, -10, 0, 10, 20, ...)
    let rawSteeringAngleRad = -Math.atan(
      PURE_PURSUIT_2L * Math.sin(targetAngleRad) /
      (PURE_PURSUIT_K * sensors.speed));
    let rawSteeringAngleDeg = rawSteeringAngleRad * DEG_PER_RAD;

    // normalize between[-1,1]
    let normalizedSteeringAngle = Utils.clamp(rawSteeringAngleDeg / MAX_STEERING_ANGLE_DEG, -1.0, 1.0);

    if (USE_STEERING_FILTER) {
      this.steeringCmdFilter.push(normalizedSteeringAngle);
      action.steering = this.steeringCmdFilter.get();
    } else {
      action.steering = normalizedSteeringAngle;
    }

    // On straight segments, correct for vehicle drift near edge of track 
    if (EDGE_AVOIDANCE_ENABLED && sensors.isOnTrack()) {
      let edgeSteeringCorrection = 0;

      if (sensors.trackPos > EDGE_MAX_TRACK_POS && sensors.angle < 0.005) { // too far left
        edgeSteeringCorrection = -EDGE_STEERING_INPUT;
      } else if (sensors.trackPos < -EDGE_MAX_TRACK_POS && sensors.angle > -0.005) { // too far right
        edgeSteeringCorrection = EDGE_STEERING_INPUT;
      }

      action.steering += edgeSteeringCorrection;

      if (Settings.verboseLevel && edgeSteeringCorrection != 0) {
        if (edgeSteeringCorrection < 0) console.log(`EDGE AVOIDANCE APPLIED (${edgeSteeringCorrection}) - PUSH RIGHT`);
        else console.log(`EDGE AVOIDANCE APPLIED (${edgeSteeringCorrection}) - PUSH LEFT`);
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
    let brakingZone = sensors.maxDistance < sensors.speedX / 1.5;
    let targetSpeed = 0;
    let hasWheelSpin = false;

    if (sensors.isOnTrack()) {
      targetSpeed = brakingZone ?
        Math.max(DEFAULT_MIN_SPEED, sensors.maxDistance) :
        DEFAULT_MAX_SPEED;

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

      hasWheelSpin = sensors.speedX > 5.0 && slippagePercent < 80.0;
      if (hasWheelSpin) { // excessive wheelspin preempts normal accel/decel calc
        if (Settings.verboseLevel == 1) console.log('WHEEL SPIN: ', wheelSpinDelta, slippagePercent);
        accel = this.curAccel -= WHEELSPIN_ACCEL_DELTA;
      }
    } else { // off track
      targetSpeed = OFF_TRACK_TARGET_SPEED;
    }

    if (!hasWheelSpin) {
      this.speedController.setTarget(targetSpeed);
      accel = this.speedController.update(sensors.speed);
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

  computeRecoveryTargetAngle(sensors: SensorData, newTrackPos?: number): number {

    let targetAngle = 0;
    let trackPos = newTrackPos ? newTrackPos : sensors.trackPos;

    // clockwise Q1=[0,90), Q2=[90,+], Q3=[-90,-], Q4=[0,-90)
    let quadrant = 0;
    if (sensors.angle >= 0.0 && sensors.angle < PI_HALF) {
      quadrant = Q1;
    } else if (sensors.angle >= PI_HALF) {
      quadrant = Q2;
    } else if (sensors.angle <= -PI_HALF) {
      quadrant = Q3;
    } else {
      quadrant = Q4;
    }

    let trackSide = MIDDLE;
    if (trackPos > 1.0) {
      trackSide = LEFT_SIDE
    } else if (trackPos < -1.0) {
      trackSide = RIGHT_SIDE;
    }

    switch (quadrant) {
      case Q1:
        if (trackSide == LEFT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('LLL-Q1Q1Q1');
          targetAngle = PI_FOURTHS - sensors.angle;
        } else if (trackSide == RIGHT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('R1R1R1');
          targetAngle = -PI_FOURTHS;
        }
        // Note: when trackSide == MIDDLE -> normal steering logic applied
        break;

      case Q2:
        if (trackSide == RIGHT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('R2R2R2');
          targetAngle = PI_FOURTHS;
        } else { // left or middle   
          if (Settings.verboseLevel > 1) console.log('LLL-Q2Q2Q2');
          targetAngle = -PI_FOURTHS;
        }
        break;

      case Q3:
        if (trackSide == LEFT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('LLL-Q3Q3Q3');
          targetAngle = -PI_FOURTHS;
        } else { // right or middle
          if (Settings.verboseLevel > 1) console.log('R3R3R3');
          targetAngle = PI_FOURTHS;
        }
        break;

      case Q4:
        if (trackSide == LEFT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('LLL-Q4Q4Q4');
          targetAngle = PI_FOURTHS;
        } else if (trackSide == RIGHT_SIDE) {
          if (Settings.verboseLevel > 1) console.log('R4R4R4');
          targetAngle = -PI_FOURTHS - sensors.angle
        }
        // Note: when trackSide == MIDDLE -> normal steering logic applied
        break;
    }

    return targetAngle;
  }

  isStalled(sensors: SensorData): boolean {
    this.speedMonitor.push(sensors.speed);
    return this.speedMonitor.get() < 2.0;
  }

}




