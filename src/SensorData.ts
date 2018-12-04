
import { SimMessage } from "./SimMessage";

//sensor data message
//[ "", 
//1-2    angle, -0.00335615
//2-4    curLapTime 2.886
//4-6    damage 0
//7-8    distFromStart 2485.2
//9-10   distRaced -2.32861
//11-12  fuel 94
//13-14  gear 0
//15-16  lastLapTime 0
//17-53  opponents 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200
//54-55  race Pos 1
//56-57  rpm 942.478
//58-59  speedX -5.69438
//60-61  speedY -0.000136728
//62-63  speedZ -0.285393
//64-83  track 4.99961 5.17132 5.76188 7.04686 9.94142 14.4843 19.078 28.2538 55.2 448 200 59.6625 29.3552 19.5653 14.7564 10.0594 7.09552 5.78523 5.18151 5.00045)
//84-85  trackPos 8.44955e-005
//86-91  wheelSpinVel -3.23628 -6.285 -2.99431 -6.5510 4
//93-94  z 0.353945
//95-100  focus -1 -1 -1 -1 -1
//]




// (angle -0.0010441)
// (curLapTime -0.382)
// (damage 0)
// (distFromStart 3598.45)
// (distRaced 0)
// (fuel 94)
// (gear 0)
// (lastLapTime 0)
// (opponents 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200)
// (racePos 1)
// (rpm 2463.03)
// (speedX -0.0187696)
// (speedY 0.0280653)
// (speedZ 0.000175783)
// (track 3.99991 4.13986 4.61592 5.65083 7.98539 11.6707 15.748 31.5162 110.847 64.7396 45.9686 35.2198 27.6343 22.3446 15.938 11.3257 9.24328 8.28462 8.00009)
// (trackPos 0.333348)
// (wheelSpinVel 0 0 -2.01446 2.0326)
// (z 0.345262)
// (focus -1 -1 -1 -1 -1)
// (x 446.682)
// (y 51.3348)
// (roll -1.34061e-05)
// (pitch -0.00719975)
// (yaw 0.00104836)
// (speedGlobalX -0.00522146)
// (speedGlobalY 0.00779077)


export class SensorData {

  private static ANGLE_DATA_IDX: number = 2;
  private static CURLAPTIME_DATA_IDX: number = 4;
  private static DAMAGE_DATA_IDX: number = 6;
  private static DISTFROMSTART_DATA_IDX: number = SensorData.DAMAGE_DATA_IDX + 2;
  private static DISTRACED_DATA_IDX: number = SensorData.DISTFROMSTART_DATA_IDX + 2;
  
  private static GEAR_DATA_IDX: number = 14;
  private static RPM_DATA_IDX: number = 57;
  private static SPEEDX_DATA_IDX: number = 59;
  private static TRACKSENSORS_DATA_IDX: number = 64; //this is off by +1 to the doc above
  private static TRACKPOS_DATA_IDX: number = 85;
  private static WHEELSPINVELOCITY_DATA_IDX: number = 87;
  
  
  private data: string[];
  
  private trackEdgeSensorsData : number[];
  private wheelSpinVelocityData : number[];

  constructor(msg: SimMessage) {
    this.data = msg.data;
  }

  get angle(): number {
    return Number(this.data[SensorData.ANGLE_DATA_IDX]);
  }

  get currentLapTime() : number {
    return Number(this.data[SensorData.CURLAPTIME_DATA_IDX]);
  }
  
  get distanceRaced() : number {
    return Number(this.data[SensorData.DISTRACED_DATA_IDX]);
  }
  
  get damage(): number {
    return parseInt(this.data[SensorData.DAMAGE_DATA_IDX]);
  }

  get speedX(): number {
    return parseFloat(this.data[SensorData.SPEEDX_DATA_IDX]);
  }

  get gear(): number {
    return parseFloat(this.data[SensorData.GEAR_DATA_IDX]);
  }
  
  get rpm(): number {
    return parseInt(this.data[SensorData.RPM_DATA_IDX]);
  }

  get trackPos(): number {    
    return parseFloat(this.data[SensorData.TRACKPOS_DATA_IDX]);
  }
  
  get trackEdgeSensors(): number[] {
    if (!this.trackEdgeSensorsData) {
      this.trackEdgeSensorsData = new Array<number>(19);
      for (let i: number=0; i<19; i++) {
        let val:number = parseFloat(this.data[SensorData.TRACKSENSORS_DATA_IDX + i + 1]);
        this.trackEdgeSensorsData[i]=val;
      }
    }
    return this.trackEdgeSensorsData;
  }
  
  get wheelSpinVelocity(): number[] {
    if (!this.wheelSpinVelocityData) {
      this.wheelSpinVelocityData = new Array<number>(4);
      for (let i: number=0; i<4; i++) {
        let val:number = parseFloat(this.data[SensorData.WHEELSPINVELOCITY_DATA_IDX + i]);
        this.wheelSpinVelocityData[i]=val;
      }
    }
    return this.wheelSpinVelocityData;
  }
  
  toString(): string {
    let msg: string =  "{angle: " + (this.angle * 180/Math.PI).toFixed(1) + ", speedX: " + this.speedX.toFixed(1) +
           ", rpm:" + this.rpm + ", trackPos: " + this.trackPos.toFixed(1) +
           ", damage: " + this.damage + "\n";
    let x = "     ";
    for ( let i:number = 0; i < 19;  i++) {
        x += Math.round(this.trackEdgeSensors[i]) + " ";
        if (i == 9) x += "\n    ";
    }
    msg += x + "}";
    return msg;
  }
}