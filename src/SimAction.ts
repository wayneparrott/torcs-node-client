import { Utils } from "./Utils";


export class SimAction {

  public accelerate: number = 0; // 0..1 (double)
  public brake: number = 0; // 0..1 (double)
  public clutch: number = 0; // 0..1 (double)
  public gear: number = 0; // -1..6 (int)
  public steering: number = 0;  // -1..1 (double), -1 full right, 1 full left
  public restartRace: boolean = false;
  public focus: number = 360;//(int) ML Desired focus angle in degrees [-90; 90], set to 360 if no focus reading is desired!

  toString(): string {
    this.normalizeValues();
    return `(accel ${this.accelerate.toFixed(3)})\
(brake ${this.brake.toFixed(3)})\
(clutch ${this.clutch})\
(gear ${this.gear})\
(steer ${this.steering.toFixed(3)})\
(meta ${this.restartRace ? 1 : 0})\
(focus ${this.focus})`;
  }

  normalizeValues(): void {
    this.accelerate = Utils.clamp(this.accelerate, 0, 1);
    this.brake = Utils.clamp(this.brake, 0, 1);
    this.clutch = Utils.clamp(this.clutch, 0, 1);
    this.steering = Utils.clamp(this.steering, -1, 1);
    this.gear = Utils.clamp(this.gear, -1, 6);
  }
}