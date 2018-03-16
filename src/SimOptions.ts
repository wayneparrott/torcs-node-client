

interface SimOptions {
    ipaddr: string;
    port: number;
    raceConfig: string;
    distanceSensorAngles?: number[];
    disableFuel? : boolean;
    disableDamage? : boolean;
    disableLaptime? : boolean;
    timeout? : number;
    noisySensors? :boolean;
    verbose?: boolean;
}
