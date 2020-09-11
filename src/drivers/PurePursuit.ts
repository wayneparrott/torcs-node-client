
import { SimAction } from '../SimAction';
import { Driver } from '../Driver';
import { SensorData } from '../SensorData';
import * as Controller from 'node-pid-controller';
import { Utils } from '../Utils';
import { Settings } from '../Settings';
// import { ETIMEDOUT } from 'constants';
import { Segment, SegmentProfile, SegmentFactory } from '../TrackInfo';
import { AssertionError } from 'assert';

const createMovingAvg = require('live-moving-average')


const RAD_PER_DEG = Math.PI / 180.0;
const DEG_PER_RAD = 1.0 / RAD_PER_DEG;

const DEFAULT_MIN_SPEED = 70;
const DEFAULT_MAX_SPEED = 250;

const GEAR_MAX = 6;
const RPM_MAX = 9200;
const ACCEL_MAX = 1.0;
const ACCEL_DELTA = 0.1;

const BRAKING_MAX = -0.5;
const BRAKING_DELTA = 0.05;
const WHEELSPIN_ACCEL_DELTA = 0.025;
const WHEELSPIN_MAX = 5.0; // greater than this value --> loss of control

const PURE_PURSUIT_K = 0.25;
const PURE_PURSUIT_L = 2.4;
const PURE_PURSUIT_2L = 2 * PURE_PURSUIT_L;
const MAX_STEERING_ANGLE_DEG = 25;
const MAX_STEERING_ANGLE_RAD = MAX_STEERING_ANGLE_DEG * RAD_PER_DEG;
const PRETURN_STEERING_BIAS = 0.05;
const PRETURN_TRACK_POS = 0.8;
const STEERING_FILTER_SIZE = 5;

const EDGE_AVOIDANCE_ENABLED = false;

const SPEED_PID: Controller.Options = {
	k_p: 0.2,
	k_i: 0,
	k_d: 5
};


export class PurePursuitDriver extends Driver {

	private speedController: Controller;
	private curAccel = 0;
	private steeringCmdFilter = createMovingAvg(STEERING_FILTER_SIZE, 0);
	private turnProfiler = new TurnProfiler();
	private turnProfile = null;
	private started = false;
	private lap = 0;
	private prevSensors: SensorData;

	constructor(name: string) {
		super(name);

		this.speedController = new Controller(SPEED_PID);
		this.speedController.setTarget(0);

		this.curAccel = 0;
	}

	control(sensors: SensorData): SimAction {
		let action = new SimAction();

		console.log('----------------');

		this.computeSteering(sensors, action);
		this.computeSpeed(sensors, action);

		// if (this.prevSensors && sensors.distanceFromStart < this.prevSensors.distanceFromStart) {
		// 	this.lap++;
		// 	if (this.lap === 1) {
		// 		this.turnProfiler.add(sensors.)
		// 	}
		// }
		this.prevSensors = sensors;

		return action;
	}


	// * steer towards longest distance measure
	// * greater tgt angle -> increased turn angle
	// * increased turn angle -> slower tgt speed
	// 
	// todo: account for vehicle angle to track, currently assume parallel with track centerline
	computeSteering(sensors: SensorData, action: SimAction): void {

		let maxDistanceAngle = sensors.maxDistanceAngle;
		// if (maxDistanceAngle != 0) {
		// 	if (maxDistanceAngle < 0) maxDistanceAngle -= 10;
		// 	if (maxDistanceAngle >0) maxDistanceAngle += 10;
		// }

		let maxDistanceAngleRad = maxDistanceAngle * RAD_PER_DEG;

		console.log('maxDSensor', sensors.maxDistanceSensor, 'maxDAngle', maxDistanceAngle, 'maxDist', sensors.maxDistance);

		// if (maxDistanceAngle < 0) {
		// 	this.turnProfiler.add(TURN_DIRECTION.LEFT);
		// } else if (maxDistanceAngle > 0) {
		// 	this.turnProfiler.add(TURN_DIRECTION.RIGHT);
		// }

		// alpha (a) = angle of longest sensor (... -20, -10, 0, 10, 20, ...)
		let rawSteeringAngleRad = Math.atan(
			PURE_PURSUIT_2L * Math.sin(maxDistanceAngleRad) /
			(PURE_PURSUIT_K * sensors.speedX));
		let rawSteeringAngleDeg = -rawSteeringAngleRad * DEG_PER_RAD;

		// if (Math.abs(maxDistanceAngle) > 30) {
		// 	console.log('FLATTEN');
		// 	if (rawSteeringAngleDeg < 0) rawSteeringAngleDeg += 20; // flatten right turn
		// 	if (rawSteeringAngleDeg < 0) rawSteeringAngleDeg -= 20; // flatten left turn
		// }

		// normalize between[-1,1]
		let normalizedSteeringAngle = Utils.clamp(rawSteeringAngleDeg / MAX_STEERING_ANGLE_DEG, -1.0, 1.0);

		//action.steering = normalizedSteeringAngle;

		this.steeringCmdFilter.push(normalizedSteeringAngle);
		action.steering = this.steeringCmdFilter.get();

		//if (action.steering === 0.0) {
		// high speed drift or turn
		// on left side drifting further to the left
		if (EDGE_AVOIDANCE_ENABLED) {
			if (sensors.trackPos > PRETURN_TRACK_POS && sensors.angle < 0.005) {
				action.steering -= PRETURN_STEERING_BIAS;
				console.log('EDGE AVOIDANCE APPLIED - PUSH RIGHT');
			} else if (sensors.trackPos < PRETURN_TRACK_POS && sensors.angle > 0.005) {
				action.steering += PRETURN_STEERING_BIAS;
				console.log('EDGE AVOIDANCE APPLIED - PUSH LEFT');
			}
		}

		console.log('steering- trkpos: ', sensors.trackPos.toFixed(3), 'rawSteerAngle: ',
			rawSteeringAngleDeg.toFixed(3), 'steer: ', action.steering.toFixed(3),
			'yaw: ', sensors.angle
		);
	}

	computeSpeed(sensors: SensorData, action: SimAction): void {
		let accel = 0;
		let gear = sensors.gear;
		let brakeZone = sensors.speedX / 1.5;

		let maxDistanceAngle = sensors.maxDistanceAngle;
		let targetSpeed = sensors.maxDistance < brakeZone ? Math.max(DEFAULT_MIN_SPEED, sensors.maxDistance) : DEFAULT_MAX_SPEED;

		console.log('maxDSensor', sensors.maxDistanceSensor, 'maxDAngle', maxDistanceAngle, 'maxDist', sensors.maxDistance);

		// detect wheel spin
		let frontWheelAvgSpeed = (sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]) / 2.0;
		let rearWheelAvgSpeed = (sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) / 2.0;
		let slippagePercent = frontWheelAvgSpeed / rearWheelAvgSpeed * 100.0;

		let wheelSpinDelta =
			Math.abs(
				((sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]) / 2) -
				((sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) / 2));

		console.log('Wheel rotation: ', sensors.wheelSpinVelocity);

		let hasWheelSpin = sensors.speedX > 5.0 && slippagePercent < 80.0;
		if (hasWheelSpin) { // excessive wheelspin preempts normal accel/decel calc
			console.log('WHEEL SPIN: ', wheelSpinDelta, slippagePercent);
			accel = this.curAccel -= WHEELSPIN_ACCEL_DELTA;
		} else {
			this.speedController.setTarget(targetSpeed);
			accel = this.speedController.update(sensors.speedX);
			console.log('PID: ', accel, sensors.speedX);
		}

		if (accel > 0) { // on the gas pedal
			accel = Utils.clamp(accel, 0.0, this.curAccel + ACCEL_DELTA);
			if (sensors.gear === 0 || sensors.rpm > RPM_MAX) {
				gear++;
			}
		}
		else if (accel < 0) { // on the brake pedal
			accel = Utils.clamp(accel, this.curAccel - BRAKING_DELTA, 0.0);

			if (sensors.rpm < RPM_MAX / 1.5) {
				gear--;
			}
		}

		action.gear = Utils.clamp(gear, 1, GEAR_MAX);

		accel = Utils.clamp(accel, BRAKING_MAX, ACCEL_MAX);
		this.curAccel = accel;
		action.accelerate = accel > 0.0 ? accel : 0.0;
		action.brake = accel < 0.0 ? Math.abs(accel) : 0.0;

		console.log('dist: ', Math.trunc(sensors.maxDistance), 'tgtspeed:', Math.trunc(targetSpeed),
			'accel:', accel.toFixed(3), 'gear:', action.gear);
	}

	reset(): void {

	}

	shutdown(): void {

	}

}

enum TURN_DIRECTION { LEFT, STRAIGHT, RIGHT };

type TurnSegment = { location: number, direction: TURN_DIRECTION };

class TurnProfile {

	private mruIdx = 0;

	constructor(private segments: Array<TurnSegment>) {
		if (!segments || segments.length == 0) {
			throw new Error('Invalid parameter, expected TurnSegment[]');
		}
	}

	size(): number {
		return this.segments.length + 1;
	}

	getSegmentByIndex(idx: number): TurnSegment {
		if (idx < 0 || idx > this.size() - 1) {
			throw new RangeError('Invalid index');
		}

		return this.segments[idx];
	}

	find(lapDistance: number, stopIdx = -1): TurnSegment {
		// find index of segment
		let segment = this.getSegmentByIndex(this.mruIdx);
		let nextSegmentIdx = (this.mruIdx + 1) % this.size();
		let nextSegment = this.getSegmentByIndex(nextSegmentIdx);
		if (segment.location <= lapDistance && lapDistance < nextSegment.location) {
			return segment;
		}

		// look ahead to next segment
		if (stopIdx == this.mruIdx) {
			return null;
		}

		stopIdx = stopIdx == -1 ? (this.mruIdx + this.size()) % this.size() : stopIdx;

		this.mruIdx = ++this.mruIdx % this.size();
		return this.find(lapDistance, stopIdx);
	}

}

class TurnProfiler {

	private idx = -1;
	private data = new Array<TURN_DIRECTION>();

	get size() {
		return this.idx + 1;
	}

	add(turn: TURN_DIRECTION, lapDistance: number) {
		this.data[++this.idx] = turn;
	}

	creatProfile(): Array<TURN_DIRECTION> {
		let profile = new Array<TURN_DIRECTION>();
		let currentSegmentType;

		for (let i = 0; i <= this.idx; i++) {
			let turn = this.data
			if (currentSegmentType != turn) {
				profile.push(currentSegmentType);
				currentSegmentType = turn;
			}
		}

		return profile;
	}

}




