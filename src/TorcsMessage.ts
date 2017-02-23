
import {MessageType} from "./MessageType";

export class TorcsMessage {
  readonly type: MessageType;
  readonly data: string[];
  
  constructor(msgType: MessageType, msgData: string[]) {
    this.type = msgType;
    this.data = msgData;
  }
  
  isDataMessage(): boolean {
    return this.type == MessageType.DATA;
  }
  
  isStatusMessage(): boolean {
    return !this.isDataMessage();
  }
  
  isInitMessage(): boolean {
    return this.type == MessageType.INIT;
  }
  
  isRestartMessage(): boolean {
    return this.type == MessageType.RESTART;
  }
  
  isShutdownMessage(): boolean {
    return this.type == MessageType.SHUTDOWN;
  }
  
}