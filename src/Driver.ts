
import { Action } from './Action'
import { SensorData } from './SensorData'

export abstract class Driver {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  
  abstract control(sensors: SensorData): Action;
  abstract shutdown(): void;
  abstract reset(): void;
  
  requestReset(): Action {
    // called at the beginning of each new trial
    let action = new Action();
    action.restartRace = true;
    return action;
  } 
  
  initAngles(): number[] {
    let angles: number[] = new Array<number>(19);
    for (let i = 0; i < 19; ++i)
      angles[i] = -90 + i * 10;
    return angles;
  }
}