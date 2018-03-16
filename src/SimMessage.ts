
import {SimMessageType} from "./SimMessageType";

export class SimMessage {
  readonly type: SimMessageType;
  readonly data: string[];
  
  constructor(msgType: SimMessageType, msgData: string[]) {
    this.type = msgType;
    this.data = msgData;
  }
  
  isDataMessage(): boolean {
    return this.type == SimMessageType.DATA;
  }
  
  isStatusMessage(): boolean {
    return !this.isDataMessage();
  }
  
  isInitMessage(): boolean {
    return this.type == SimMessageType.INIT;
  }
  
  isRestartMessage(): boolean {
    return this.type == SimMessageType.RESTART;
  }
  
  isShutdownMessage(): boolean {
    return this.type == SimMessageType.SHUTDOWN;
  }
  
}