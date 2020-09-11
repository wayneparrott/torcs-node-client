import { SensorData } from "./SensorData";


export enum SegmentProfile {
  UNKNOWN,
  STRAIGHT,
  LEFT_TURN,  // left
  RIGHT_TURN,  // far preturn right
  }

export const CENTER_SENSOR = 9;
export const SENSOR_CNT = 19;

export interface Segment {
	type: SegmentProfile;
	start: number;
	end: number;
	length: number;
}

export class SegmentFactory {

	static fromProperties(type = SegmentProfile.UNKNOWN, start = 0, end = 0): Segment {
		return new BasicSegment(type, start, end);
	}

	static fromSensors(sensors: SensorData): Segment {
		return new SensorBasedSegment(sensors);
	}
}

class BasicSegment implements Segment {
	constructor(public type = SegmentProfile.UNKNOWN, public start = 0, public end = 0) {
	}

	get length() {
		return this.end - this.start + 1;
	}
}

class SensorBasedSegment implements Segment {
	public type: SegmentProfile;
	public start: number;

	constructor(sensors: SensorData) {
		this.start = sensors.distanceFromStart;

		if (sensors.maxDistanceAngle < 0) {
			this.type = SegmentProfile.LEFT_TURN;
		} else if (sensors.maxDistanceAngle < 0) {
			this.type = SegmentProfile.RIGHT_TURN;
		} else {
			this.type = SegmentProfile.STRAIGHT;
		} 
	}

	get end() {
		return this.start;
	}

	get length() {
		return this.end - this.start + 1;
	}
}

