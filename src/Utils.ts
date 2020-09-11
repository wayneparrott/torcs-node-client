


export class Utils {

  // example call from async function/method:
  //
  //  await Util.createDelay(500);
  static createDelay(millis): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(val, max));
  }

}



