


export class Action {

    public accelerate: number = 0; // 0..1 (double)
    public brake: number = 0; // 0..1 (double)
    public clutch: number = 0; // 0..1 (double)
    public gear: number = 0; // -1..6 (int)
    public steering: number = 0;  // -1..1 (double)
    public restartRace: boolean = false;
    public focus: number = 360;//(int) ML Desired focus angle in degrees [-90; 90], set to 360 if no focus reading is desired!
xxx
    toString(): string {
        this.limitValues();
        return "(accel " + this.accelerate  + ") " +
               "(brake " + this.brake  + ") " +
               "(clutch " + this.clutch  + ") " +
               "(gear " + this.gear + ") " +
               "(steer " + this.steering + ") " +
               "(meta " + (this.restartRace ? 1 : 0) 
               + ") " + "(focus " + this.focus //ML
               + ")";
    }
  
    limitValues(): void {
        this.accelerate = Math.max (0, Math.min (1, this.accelerate));
        this.brake = Math.max (0, Math.min (1, this.brake));
        this.clutch = Math.max(0, Math.min(1, this.clutch));
        this.steering = Math.max (-1, Math.min (1, this.steering));
        this.gear = Math.max (-1, Math.min (6, this.gear));
        
    }
}