

import { SimAction } from '../../SimAction'
import { Driver } from '../../Driver'
import { SensorData } from '../../SensorData'

export class LeftTurnDriver extends Driver {

  control(sensors: SensorData): SimAction {

    let action = new SimAction();
	action.gear = 1;
	action.accelerate = 0.2;
	action.steering = 1.0 // full left turn

    return action;
  }

  reset(): void {

  }

  shutdown(): void {

  }

}