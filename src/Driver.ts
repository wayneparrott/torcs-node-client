
import { SimAction } from './SimAction'
import { SensorData } from './SensorData'

export abstract class Driver {

  constructor(readonly name: string) {
  }

  abstract control(sensors: SensorData): SimAction;
  abstract reset(): void;
  abstract shutdown(): void;
  
  initDistanceMeasureAngles(): number[] {
    let angles: number[] = new Array<number>(19);
    for (let i = 0; i < 19; ++i)
      angles[i] = -90 + i * 10;
    return angles;
  }
}
