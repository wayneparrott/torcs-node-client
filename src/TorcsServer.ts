
import { SimAction } from "./SimAction";
import { Driver } from './Driver'
import { SensorData } from './SensorData';
//import { KeyboardDriver } from './experimental/KeyboardDriver'
import { SimpleDriver } from './SimpleDriver'
import { WebServer } from './WebServer'
import { SimController } from "./SimController";
import { SimListener } from './SimListener';
import { SimMessage } from './SimMessage';
import { SimMessageType } from './SimMessageType';

 

export class TorcsServer implements SimListener {
    static TORCS_SIM_HOST: string = 'localhost';
    static TORCS_SIM_PORT: number = 3001;
    static WEB_PORT: number = 80;
    static SIM_EXE_PATH: string = 'c://dev/sim/torcs/wtorcs.exe';

    private simController: SimController;
    private driver: Driver;

    constructor() {
        this.simController =
            new SimController(this, TorcsServer.TORCS_SIM_HOST, TorcsServer.TORCS_SIM_PORT);

        this.driver = new SimpleDriver('zirk');
    }


    run(): void {
        this.simController.start();
    }

    stop(): void {
        this.simController.stop();
    }

    handleMessage(msg: SimMessage) {
        if (msg.type == SimMessageType.DATA) {
            let sensorData: SensorData = new SensorData(msg);
            let action: SimAction = this.driver.control(sensorData);
            this.simController.sendAction(action);
        }
    }

};

let torcsServer = new TorcsServer();
torcsServer.run();
setTimeout(() => {
    console.log('xxx');
    //torcsServer.stop();
    console.log('zzz')
},
    15000);

//    this.driver = new SimpleDriver('zirk');
//    this.driver = new KeyboardDriver('zirk');
//    this.driver = new SCRSimpleDriver('zirk');

/*
    this.ws = new WebServer();
    this.ws.start();

 if (msg.isInitMessage()) {
//        console.log("INITTTTT");
      } else if (msg.isDataMessage()) {
//        console.log("DATAAAAAA");
        let sensors: SimSensorData = new SimSensorData(msg);
        console.log(sensors.toString());
        let action = this.driver.control(sensors);
        this.send(action.toString());
        
        let webSensors = {speed: sensors.speedX, rpm: sensors.rpm, 
                          gear: sensors.gear, steer: action.steering, 
                          damage: sensors.damage};
        this.ws.send(JSON.stringify(webSensors));
      } else if (msg.isRestartMessage()) {
        console.log("RESETTTT");
      }
        else {
        console.log("OTHERRRRR");
      }
*/
