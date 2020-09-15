


export class Utils {

  // example call from async function/method:
  //
  //  await Util.createDelay(500);
  static delay(millis): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(val, max));
  }

}

// "canvas-gauges": "^2.1.7",
//     "dgram": "^1.0.1",
//     "fs": "0.0.1-security",
//     "http-server": "^0.9.0",
//     "httpdispatcher": "^2.1.2",
//     "keypress": "^0.2.1",
//     "live-moving-average": "^1.0.0",
//     "node-pid-controller": "^1.0.1",
//     "path": "^0.12.7",
//     "tty": "^1.0.1",
//     "ws": "^1.1.1"

