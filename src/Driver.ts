
import {SimAction} from './SimAction'
import {SensorData} from './SensorData'

export abstract class Driver {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }

  abstract control(sensors: SensorData): SimAction;
  abstract shutdown(): void;
  abstract reset(): void;

  requestReset(): SimAction {
    // called at the beginning of each new trial
    let action = new SimAction();
    action.restartRace = true;
    return action;
  }

  initDistanceMeasureAngles(): number[] {
    let angles: number[] = new Array<number>(19);
    for (let i = 0; i < 19; ++i)
      angles[i] = -90 + i * 10;
    return angles;
  }
}