
import { SimAction } from '../SimAction';
import { Driver } from '../Driver';
import { SensorData } from '../SensorData';
import * as Controller from 'node-pid-controller';
import { Utils } from '../Utils';
import { Settings } from '../Settings';
// import { ETIMEDOUT } from 'constants';
import { Segment, SegmentProfile, SegmentFactory } from '../TrackInfo';
import { AssertionError } from 'assert';

const DEFAULT_MIN_SPEED = 35;
const DEFAULT_MAX_SPEED = 250;

const DEFAULT_BRAKE_ZONE = 100;
const TURN_START_DISTANCE = 75; // meters
const RPM_REDLINE = 9200;

const STEERING_PID: Controller.Options = {
	// k_p: 5,
	// k_i: 0.00001,
	// k_d: 100 
	k_p: 0.1,
	// k_i: 0.00001,
	k_d: 30
};

const SPEED_PID: Controller.Options = {
	k_p: 0.1,
	k_i: 0,
	k_d: 5
};

export class PIDDriver extends Driver {

	brakeZone = DEFAULT_BRAKE_ZONE;
	minSpeed = DEFAULT_MIN_SPEED;
	maxSpeed = DEFAULT_MAX_SPEED;

	readonly straightTargetSpeed: number = 100;
	readonly turnTargetSpeed: number = 50;
	private driveLine = -100;
	private startTime: number;
	private trackPosProfile = SegmentProfile.STRAIGHT;
	private curSteering = 0;
	private steeringController: Controller;
	private speedController: Controller;
	private curAccel = 0;
	private started = false;
	private map: Map;

	constructor(name: string) {
		super(name);

		let map = [
			SegmentFactory.fromProperties(SegmentProfile.STRAIGHT, 0, 169),
			SegmentFactory.fromProperties(SegmentProfile.RIGHT_TURN, 170, 204),
			SegmentFactory.fromProperties(SegmentProfile.STRAIGHT, 205, 289),
			SegmentFactory.fromProperties(SegmentProfile.RIGHT_TURN, 290, 359),
			SegmentFactory.fromProperties(SegmentProfile.LEFT_TURN, 360, 419),
			SegmentFactory.fromProperties(SegmentProfile.UNKNOWN, 420, 2399),
			SegmentFactory.fromProperties(SegmentProfile.STRAIGHT, 2400, 2600)
		];
		this.map = new Map(map);

		this.steeringController = new Controller(STEERING_PID);
		this.steeringController.setTarget(0);

		this.speedController = new Controller(SPEED_PID);
		this.speedController.setTarget(0);

		this.curSteering = 0;
		this.curAccel = 0;

		this.minSpeed = DEFAULT_MIN_SPEED;
		this.maxSpeed = DEFAULT_MAX_SPEED;
		this.brakeZone = DEFAULT_BRAKE_ZONE;

	}

	control(sensors: SensorData): SimAction {
		let action = new SimAction();

		console.log('----------------');

		this.computeSteering1(sensors, action);
		this.computeSpeed(sensors, action);

		return action;
	}

	computeSteering(sensors: SensorData, action: SimAction): void {

		let driveline = 0;
		let error = sensors.trackPos - driveline;

		this.steeringController.setTarget(driveline);
		this.steeringController.k_p = 0.01 + Math.abs(9 - sensors.maxDistanceSensor);
		this.steeringController.k_d = 30 + this.steeringController.k_p * 20;

		let s = this.steeringController.update(sensors.trackPos);
		console.log('driveline:', driveline.toFixed(3));

		if (s < -1 || s > 1) {
			console.log('*************S:', s);
			action.steering = this.curSteering;
		} else {
			action.steering = s;
		}

		this.curSteering = action.steering;

		console.log('steering- trkpos: ', sensors.trackPos.toFixed(3), 'tgt: ',
			this.steeringController.target.toFixed(3), 'piderror:', error.toFixed(3), 'steer', action.steering.toFixed(3),
			'k_p:', this.steeringController.k_p.toFixed(3)
		);
	}

	// * steer towards longest distance measure
	// * greater tgt angle -> increased turn angle
	// * increased turn angle -> slower tgt speed
	//
	computeSteering1(sensors: SensorData, action: SimAction): void {

		let segment = this.map.setLocation(sensors.distanceFromStart);
		let nextSegment = this.map.getNextSegment();

		let driveline = sensors.trackPos;

		if (segment.type === SegmentProfile.RIGHT_TURN) { // right turn
			// driveline = Utils.clamp(sensors.trackPos, -0.9, -0);

			driveline = driveline > -0.7 ?
				Utils.clamp(sensors.trackPos - 0.075, -0.7, sensors.trackPos) :
				Utils.clamp(driveline, -0.9, -0.7);


			// driveline = driveline > -0.5 ?
			// 	Utils.clamp(sensors.trackPos - 0.1, -0.5, sensors.trackPos) :
			// 	Utils.clamp(driveline, -0.5, -0.9);
			console.log('RIGHT TURN: trkpos:', sensors.trackPos, 'tgtdriveline:', driveline);
		} else if (segment.type === SegmentProfile.LEFT_TURN) { // left turn
			driveline = driveline < 0.5 ?
				Utils.clamp(sensors.trackPos + 0.1, sensors.trackPos, 0.5) :
				Utils.clamp(driveline, 0.5, 0.9);
			console.log('LEFT TURN');
		}
		// Otherwise on STRAIGHT
		else if (nextSegment.type === SegmentProfile.RIGHT_TURN) {

			driveline = driveline < 0.5 ? sensors.trackPos + 0.1 : 0.5;

			// driveline = driveline < 0.5 ?
			// 	Utils.clamp(sensors.trackPos + 0.05, sensors.trackPos, 0.5) :
			// 	Utils.clamp(driveline, 0.5, 0.6);
			console.log('STRAIGHT PREP FOR RIGHT TURN');
		} else if (nextSegment.type === SegmentProfile.LEFT_TURN) {

			driveline = driveline > -0.5 ? sensors.trackPos - 0.1 : -0.5;

			// driveline = driveline > -0.5 ?
			// 	Utils.clamp(sensors.trackPos - 0.1, -0.5, sensors.trackPos) :
			// 	Utils.clamp(driveline, -0.5, -0.9);
			console.log('STRAIGHT PREP FOR LEFT TURN');
		} else {
			console.log('STRAIGHT')
		}

		let error = 0;

		this.steeringController.setTarget(driveline);
		error = sensors.trackPos - driveline;

		if (segment.type === SegmentProfile.STRAIGHT) {
			this.steeringController.k_p = 0.1;
			this.steeringController.k_d = 30;
		} else {
			this.steeringController.k_p = 0.1 + Math.abs(9 - sensors.maxDistanceSensor);
			this.steeringController.k_d = 30 + this.steeringController.k_p * 10;
		}

		let s = this.steeringController.update(sensors.trackPos);
		console.log('driveline:', driveline.toFixed(3));

		if (s < -1 || s > 1) {
			console.log('*************S:', s);
			action.steering = this.curSteering;
		} else {
			action.steering = s;
		}

		this.curSteering = action.steering;

		console.log('steering- trkpos: ', sensors.trackPos.toFixed(3), 'tgt: ',
			this.steeringController.target.toFixed(3), 'piderror:', error.toFixed(3), 'steer', action.steering.toFixed(3),
			'k_p:', this.steeringController.k_p.toFixed(3)
		);
	}

	computeSpeed(sensors: SensorData, action: SimAction): void {

		action.gear = sensors.gear;

		// detect wheel spin
		let wheelSpinDelta =
			Math.abs(
				((sensors.wheelSpinVelocity[0] + sensors.wheelSpinVelocity[1]) / 2) -
				((sensors.wheelSpinVelocity[2] + sensors.wheelSpinVelocity[3]) / 2));
		console.log('Wheel rotation: ', sensors.wheelSpinVelocity);
		if (sensors.speedX > 5.0 && wheelSpinDelta > 5.0) {
			console.log('WHEEL SPIN: ', wheelSpinDelta);
			this.curAccel -= 0.1;
			action.accelerate = Utils.clamp(this.curAccel, 0, 1.0);
		}

		let maxDistanceAngle = sensors.maxDistanceAngle;
		console.log('maxDSensor', sensors.maxDistanceSensor, 'maxDAngle', maxDistanceAngle, 'maxDist', sensors.maxDistance);

		//let targetSpeed = maxSpeed *  maxDistanceAngle / 90.0 
		let targetSpeed = sensors.maxDistance < this.brakeZone ? Math.max(this.minSpeed, sensors.maxDistance) : this.maxSpeed;

		this.speedController.setTarget(targetSpeed);
		let accel = this.speedController.update(sensors.speedX);
		let maxAccelDelta = 0.01;
		let maxDeclDelta = 0.075;
		let maxAccel = 1.0;
		let maxDecel = -0.5;
		accel = Utils.clamp(accel, this.curAccel - maxDeclDelta, this.curAccel + maxAccelDelta);
		accel = Utils.clamp(accel, maxDecel, maxAccel);

		if (accel > 0) {
			action.accelerate = accel;
			if (sensors.gear === 0 || sensors.rpm > RPM_REDLINE) {
				action.gear = sensors.gear + 1;
			}
		}
		else if (accel < 0) {
			if (sensors.speedX <= targetSpeed) {
				accel = 0;
			}
			action.brake = Math.abs(accel);
			if (sensors.rpm < 4000) {
				action.gear = sensors.gear - 1;
			}
		}

		action.gear = Utils.clamp(action.gear, 1, 6);

		this.curAccel = accel;

		console.log('dist: ', Math.trunc(sensors.maxDistance), 'tgtspeed:', Math.trunc(targetSpeed),
			//'angle%:', anglePercent.toFixed(3), 
			'accel:', accel.toFixed(3), 'gear:', action.gear);
	}

	reset(): void {

	}

	shutdown(): void {

	}

}

const DEFAULT_SEGMENT = SegmentFactory.fromProperties();

class Map {

	private locationSegmentIdx = -1;

	constructor(private segments: Array<Segment> = null) {
		if (!segments) return;

		this.locationSegmentIdx = 0;
	}

	// Standard use is to expect new locations to be incrementally
	// farther down track from the current location until we cross the start
	// and begin at the start segment.
	setLocation(distanceFromStart: number): Segment {
		if (!this.segments) {
			console.log('NO SEGS');
			this.getLocationSegment();
		}

		if (distanceFromStart > this.lastSegment.end) {
			throw new Error('Attempt to set location > map.length');
		}

		if (this.locationSegmentIdx < 0) this.locationSegmentIdx = 0;

		if (distanceFromStart < this.segments[this.locationSegmentIdx].start) {
			this.locationSegmentIdx = 0;
		}

		let found = false;
		for (; !found && this.locationSegmentIdx < this.segments.length; this.locationSegmentIdx++) {
			let segment = this.segments[this.locationSegmentIdx];
			found =
				distanceFromStart >= segment.start &&
				distanceFromStart <= segment.end;
			if (found) break;
		}

		if (!found) this.locationSegmentIdx = -1;

		return this.getLocationSegment();
	}

	getLocationSegment(): Segment {
		if (!this.segments) return DEFAULT_SEGMENT;
		if (this.locationSegmentIdx < 0) return DEFAULT_SEGMENT;
		return this.segments[this.locationSegmentIdx];
	}

	getNextSegment(): Segment {
		if (!this.segments) return DEFAULT_SEGMENT;
		if (this.locationSegmentIdx < 0) return DEFAULT_SEGMENT;
		if (this.locationSegmentIdx + 1 >= this.segments.length) return this.segments[0];
		return this.segments[this.locationSegmentIdx + 1];
	}

	private get lastSegment() {
		return this.segments[this.segments.length - 1];
	}
}

class MapBuilder {
	private isBuilding
	private segments: Array<Segment>;
	private segmentCount: number;

	start() {

	}

	stop() {

	}

	// log(sensors: SensorData) {
	// 	let segment = n
	// }

	build(): Map {

		return null;
	}
}

function testMap() {
	let segments = [
		SegmentFactory.fromProperties(SegmentProfile.STRAIGHT, 0, 99),
		SegmentFactory.fromProperties(SegmentProfile.LEFT_TURN, 100, 199),
		SegmentFactory.fromProperties(SegmentProfile.RIGHT_TURN, 200, 299),
	];

	let map = new Map(segments);

	let segment;

	segment = map.setLocation(0);
	console.log('0: ', segment);

	segment = map.setLocation(1);
	console.log('1: ', segment);

	segment = map.setLocation(100);
	console.log('100: ', segment);

	segment = map.setLocation(150);
	console.log('150: ', segment);

	segment = map.setLocation(199);
	console.log('199: ', segment);

	segment = map.setLocation(200);
	console.log('200: ', segment);

	segment = map.setLocation(299);
	console.log('299: ', segment);

	//segment = map.setLocation(300);
}

// testMap();



