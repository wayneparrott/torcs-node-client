
import { SimAction } from './SimAction'
import { SensorData } from './SensorData'
import { EventEmitter } from 'events';

export const DEFAULT_SENSORS_CONFIG = [
  -90.0, -75.0, -60.0, -45.0, -30.0, -20.0, -15.0, -10.0, -5.0, 
    0.0,
    5.0,  10.0, 15.0, 20.0, 30.0, 45.0, 60.0, 75.0, 90.0
];

export abstract class Driver  extends EventEmitter {

  constructor(readonly name: string) {
    super();
  }

  abstract control(sensors: SensorData): SimAction;

  restart(): void {

  }

  getSensorConfig() {
    return DEFAULT_SENSORS_CONFIG;
  }

}
