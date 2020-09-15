
import { SimMessageType } from "./SimMessageType";
import { SimMessage } from "./SimMessage";

//init reply 
//***identified***

//restart reply
//***restart***

// race over
//***shutdown***

//sensor data message
//(angle -0.00335615)(curLapTime 2.886)(damage 0)(distFromStart 2485.2)(distRaced -2.32861)
//(fuel 94)(gear 0)(lastLapTime 0)
//(opponents 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200 200)
//(race Pos 1)(rpm 942.478)(speedX -5.69438)(speedY -0.000136728)(speedZ -0.285393)
//(track 4.99961 5.17132 5.76188 7.04686 9.94142 14.4843 19.078 28.2538 55.2
//   448 200 59.6625 29.3552 19.5653 14.7564 10.0594 7.09552 5.78523 5.18151 5.00045)
//(trackPos 8.44955e-005)(wheelSpinVel -3.23628 -6.285 -2.99431 -6.5510 4)
//(z 0.353945)(focus -1 -1 -1 -1 -1)



export class SimMessageParser {
  private static INIT_MSG_BODY: string = "***identified***";
  private static RESTART_MSG_BODY: string = "***restart***";
  private static SHUTDOWN_MSG_BODY: string = "***identified***";

  private static SEPARATORS = /[\s()]+/g;

  //singleton patterns
  private static instance: SimMessageParser;
  
  static getInstance(): SimMessageParser {
    if (!SimMessageParser.instance) {
      SimMessageParser.instance = new SimMessageParser();

    }
    return SimMessageParser.instance;
  }

  parse(msg: string): SimMessage {
    let data: string[] = msg.split(SimMessageParser.SEPARATORS);
    let type: SimMessageType;
    if (data.length > 1) {
      type = SimMessageType.DATA;
    } else if (data[0] == SimMessageParser.INIT_MSG_BODY) {
      type = SimMessageType.INIT;
    } else if (data[0] == SimMessageParser.RESTART_MSG_BODY) {
      type = SimMessageType.RESTART;
    } else if (data[0] == SimMessageParser.SHUTDOWN_MSG_BODY) {
      type = SimMessageType.SHUTDOWN;
    }

    return new SimMessage(type, data);
  }

}