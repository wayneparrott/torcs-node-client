
import { MessageType } from "./MessageType";
import { TorcsMessage } from "./TorcsMessage";

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



export class MessageParser {
  private static INIT_MSG_BODY: string = "***identified***";
  private static RESTART_MSG_BODY: string = "***restart***";
  private static SHUTDOWN_MSG_BODY: string = "***identified***";

  private static SEPARATORS = /[\s()]+/g;

  //singleton patterns
  private static instance: MessageParser;
  
  static getInstance(): MessageParser {
    if (!MessageParser.instance) {
      MessageParser.instance = new MessageParser();

    }
    return MessageParser.instance;
  }

  parse(msg: string): TorcsMessage {
    let data: string[] = msg.split(MessageParser.SEPARATORS);
//console.log('parse', msg);
//console.log('data parse', data.length);
    let type: MessageType;
    if (data.length > 1) {
//      console.log("PARSER FOUND DATA");
      type = MessageType.DATA;
    } else if (data[0] == MessageParser.INIT_MSG_BODY) {
      type = MessageType.INIT;
    } else if (data[0] == MessageParser.RESTART_MSG_BODY) {
      type = MessageType.RESTART;
    } else if (data[0] == MessageParser.SHUTDOWN_MSG_BODY) {
      type = MessageType.SHUTDOWN;
    }

    return new TorcsMessage(type, data);
  }

}