

import {SocketHandler} from "./SocketHandler";

class TorcsClient {
  static HOST: string = 'localhost';
  static PORT: number = 3001;
  
  run(): void {
    
    let socketHandler: SocketHandler = 
      new SocketHandler(TorcsClient.HOST, TorcsClient.PORT, true);
    
    let initmsg: string = 
      "SCR(init " + 
      "-90.0 -75.0 -60.0 -45.0 -30.0 -20.0 -15.0 -10.0 -5.0 " +
      "0.0 " +
      "5.0 10.0 15.0 20.0 30.0 45.0 60.0 75.0 90.0)";
    
    socketHandler.send(initmsg);
  }
};

let torcsClient = new TorcsClient();
torcsClient.run();


 