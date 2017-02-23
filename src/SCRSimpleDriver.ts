import { Action } from './Action'
import { Driver } from './Driver'
import { SensorData } from './SensorData'

export class SCRSimpleDriver extends Driver {

  /* Gear Changing Constants*/
  gearUp: number[] = [5000,6000,6000,6500,7000,0];
  gearDown: number[] = [0,2500,3000,3000,3500,3500];

  /* Stuck constants*/
  stuckTime: number = 25;
  stuckAngle: number = 0.523598775; //PI/6

  /* Accel and Brake Constants*/
  maxSpeedDist: number = 70;
  maxSpeed: number = 150;
  sin5: number = 0.08716;
  cos5: number = 0.99619;

  /* Steering constants*/
  steerLock: number = 0.366519;
  steerSensitivityOffset: number = 80.0;
  wheelSensitivityCoeff: number = 1;

  /* ABS Filter Constants */
  wheelRadius: number[] = [0.3306, 0.3306, 0.3276, 0.3276];
  absSlip: number = 2.0;
  absRange: number = 3.0;
  absMinSpeed: number = 3.0;

  /* Clutching Constants */
  clutchMax: number = 0.5;
  clutchDelta: number = 0.05;
  clutchRange: number = 0.82;
  clutchDeltaTime: number = 0.02;
  clutchDeltaRaced: number = 10;
  clutchDec: number = 0.01;
  clutchMaxModifier: number = 1.3;
  clutchMaxTime: number = 1.5;

  stuck: number = 0;

  // current clutch
  clutch: number = 0;


  constructor(driverId: string) {
    super(driverId);
  }

  control(sensors: SensorData): Action {
// check if car is currently stuck
    if ( Math.abs(sensors.angle) > this.stuckAngle )
      {
      // update stuck counter
          this.stuck++;
      }
      else
      {
        // if not stuck reset stuck counter
          this.stuck = 0;
      }

    // after car is stuck for a while apply recovering policy
      if (this.stuck > this.stuckTime)
      {
        /* set gear and sterring command assuming car is 
         * pointing in a direction out of track */
        
        // to bring car parallel to track axis
          let steer : number = - sensors.angle / this.steerLock; 
          let gear : number = -1; // gear R
          
          // if car is pointing in the correct direction revert gear and steer  
          if (sensors.angle*sensors.trackPos > 0)
          {
              gear = 1;
              steer = -steer;
          }
          this.clutch = this.clutching(sensors, this.clutch);
          // build a CarControl variable and return it
          let action : Action = new Action ();
          action.gear = gear;
          action.steering = steer;
          action.accelerate = 1.0;
          action.brake = 0;
          action.clutch = this.clutch;
          return action;
      }

      else // car is not stuck
      {
        // compute accel/brake command
          let accel_and_brake : number = this.getAccel(sensors);
          // compute gear 
          let gear : number = this.getGear(sensors);
          // compute steering
          let steer : number = this.getSteer(sensors);
          

          // normalize steering
          if (steer < -1)
              steer = -1;
          if (steer > 1)
              steer = 1;
          
          // set accel and brake from the joint accel/brake command 
          let accel,brake : number;
          if (accel_and_brake>0)
          {
              accel = accel_and_brake;
              brake = 0;
          }
          else
          {
              accel = 0;
              // apply ABS to brake
              brake = this.filterABS(sensors,-accel_and_brake);
          }
          
          this.clutch = this.clutching(sensors, this.clutch);
          
          // build a CarControl variable and return it
          let action : Action = new Action ();
          action.gear = gear;
          action.steering = steer;
          action.accelerate = accel;
          action.brake = brake;
          action.clutch = this.clutch;
          return action;
      }
  }

  reset(): void {
  }

  shutdown(): void {
  }

  getGear(sensors: SensorData): number {
    let gear: number = sensors.gear;
    let rpm: number = sensors.rpm;

    // if gear is 0 (N) or -1 (R) just return 1 
    if (gear < 1)
      return 1;
    // check if the RPM value of car is greater than the one suggested 
    // to shift up the gear from the current one     
    if (gear < 6 && rpm >= this.gearUp[gear - 1])
      return gear + 1;
    else
      // check if the RPM value of car is lower than the one suggested 
      // to shift down the gear from the current one
      if (gear > 1 && rpm <= this.gearDown[gear - 1])
        return gear - 1;
      else // otherwhise keep current gear
        return gear;
  }
  
  
  getSteer(sensors : SensorData) : number {
    // steering angle is compute by correcting the actual car angle w.r.t. to track 
    // axis [sensors.getAngle()] and to adjust car position w.r.t to middle of track [sensors.getTrackPos()*0.5]
      let targetAngle : number = sensors.angle - sensors.angle * 0.5;
      // at high speed reduce the steering command to avoid loosing the control
      if (sensors.speedX > this.steerSensitivityOffset)
          return targetAngle/(this.steerLock*(sensors.speedX-this.steerSensitivityOffset) * this.wheelSensitivityCoeff);
      else
          return (targetAngle)/this.steerLock;
  }
  
  getAccel(sensors : SensorData) : number
  {
      // checks if car is out of track
      if (sensors.trackPos < 1 && sensors.trackPos > -1)
      {
          // reading of sensor at +5 degree w.r.t. car axis
          let rxSensor : number = sensors.trackEdgeSensors[10];
          // reading of sensor parallel to car axis
          let sensorsensor : number = sensors.trackEdgeSensors[9];
          // reading of sensor at -5 degree w.r.t. car axis
          let sxSensor : number = sensors.trackEdgeSensors[8];

          let targetSpeed : number;

          // track is straight and enough far from a turn so goes to max speed
          if (sensorsensor>this.maxSpeedDist || (sensorsensor>=rxSensor && sensorsensor >= sxSensor))
              targetSpeed = this.maxSpeed;
          else
          {
              // approaching a turn on right
              if(rxSensor>sxSensor)
              {
                  // computing approximately the "angle" of turn
                  let h : number = sensorsensor*this.sin5;
                  let b : number = rxSensor - sensorsensor*this.cos5;
                  let sinAngle : number = b*b/(h*h+b*b);
                  // estimate the target speed depending on turn and on how close it is
                  targetSpeed = this.maxSpeed*(sensorsensor*sinAngle/this.maxSpeedDist);
              }
              // approaching a turn on left
              else
              {
                  // computing approximately the "angle" of turn
                  let h : number = sensorsensor*this.sin5;
                  let b : number = sxSensor - sensorsensor*this.cos5;
                  let sinAngle : number = b*b/(h*h+b*b);
                  // estimate the target speed depending on turn and on how close it is
                  targetSpeed = this.maxSpeed*(sensorsensor*sinAngle/this.maxSpeedDist);
              }

          }

          // accel/brake command is exponentially scaled w.r.t. the difference between target speed and current one
          return (2/(1+Math.exp(sensors.speedX - targetSpeed)) - 1);
      }
      else
          return 0.3; // when out of track returns a moderate acceleration command

  }
  
  private filterABS(sensors: SensorData, brake: number) : number {
    // convert speed to m/s
    let speed : number = sensors.speedX / 3.6;
    // when spedd lower than min speed for abs do nothing
      if (speed < this.absMinSpeed)
          return brake;
      
      // compute the speed of wheels in m/s
      let slip : number = 0.0;
      for (let i:number = 0; i < 4; i++)
      {
          slip += sensors.wheelSpinVelocity[i] * this.wheelRadius[i];
      }
      // slip is the difference between actual speed of car and average speed of wheels
      slip = speed - slip/4.0;
      // when slip too high applu ABS
      if (slip > this.absSlip)
      {
          brake = brake - (slip - this.absSlip)/this.absRange;
      }
      
      // check brake is not negative, otherwise set it to zero
      if (brake<0)
        return 0;
      else
        return brake;
  }
  
  clutching(sensors:SensorData, clutch:number) : number
  {
       
    let maxClutch = this.clutchMax;

    // Check if the current situation is the race start
    if (sensors.currentLapTime<this.clutchDeltaTime  && sensors.distanceRaced<this.clutchDeltaRaced)
      clutch = maxClutch;

    // Adjust the current value of the clutch
    if(clutch > 0)
    {
      let delta : number = this.clutchDelta;
      if (sensors.gear < 2)
    {
        // Apply a stronger clutch output when the gear is one and the race is just started
      delta /= 2;
        maxClutch *= this.clutchMaxModifier;
        if (sensors.currentLapTime < this.clutchMaxTime)
          clutch = maxClutch;
    }

      // check clutch is not bigger than maximum values
    clutch = Math.min(maxClutch,clutch);

    // if clutch is not at max value decrease it quite quickly
    if (clutch!=maxClutch)
    {
      clutch -= delta;
      clutch = Math.max(0.0,clutch);
    }
    // if clutch is at max value decrease it very slowly
    else
      clutch -= this.clutchDec;
    }
    return clutch;
  }
  
  initAngles() : number[] {
    
    let angles : number[] = new Array<number>(19);

    /* set angles as {-90,-75,-60,-45,-30,-20,-15,-10,-5,0,5,10,15,20,30,45,60,75,90} */
    for (let i:number=0; i<5; i++)
    {
      angles[i]=-90+i*15;
      angles[18-i]=90-i*15;
    }

    for (let i:number=5; i<9; i++)
    {
        angles[i]=-20+(i-5)*5;
        angles[18-i]=20-(i-5)*5;
    }
    angles[9]=0;
    return angles;
  }
  
}