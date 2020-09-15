import { TorcsClient, MaxDamage, MaxDamagePolicy } from "./TorcsClient";

let verboseLevel = 0;
let host;
let port;
// let driver;
let maxDamage;
let maxDamagePolicy;

let argc = process.argv.length
if (argc > 1) {
  for (let i=1; i < argc; i++) {
    switch (process.argv[i].toLowerCase()) {
      case '--host':
        host = process.argv[++i];
        break;
      case '--port':
        port = parseInt(process.argv[++i]);
        break;
      // case '--driver':
      //   driver = process.argv[++i];
      //   break;
      case '--maxdamage':
        maxDamage = parseInt(process.argv[++i]);
        break;
      case '--maxdamagepolicy':
        let val = process.argv[++i].trim().toLowerCase();
        if (val == 'restart') {
          maxDamagePolicy = MaxDamagePolicy.RESTART_RACE;
        } else if (val == 'stop') {
          maxDamagePolicy = MaxDamagePolicy.STOP_PROCESS
        }
        break;
      case '--verbose2':
        verboseLevel = 2;
        break;
      case '--verbose1':
        verboseLevel = 1;
        break;
      case '-h':
        displayHelp();
        process.exit(0);
    }
  }
} 

function displayHelp() {
  console.log(' --host             hostname or ipaddress, default = localhost');
  console.log(' --port             port number, default=3001' );
  //console.log(' --driver  <driver model>');
  console.log(' --maxDamage       max damage implies unusable car, default=50');
  console.log(' --maxDamagePolicy\' \'restart\' or \'stop\', default=restart')
  console.log(' --verbose1         basic info');
  console.log(' --verbose2         detailed info');
  console.log(' -h                 display this info');
}

let maxDamageSetting;
if (maxDamage || maxDamagePolicy) {
  maxDamageSetting = {
    maxDamage: maxDamage ? maxDamage : undefined,
    policy: maxDamagePolicy ? maxDamagePolicy : undefined
  }
  console.log('MAXDAMAGESETTING:', maxDamageSetting);
}
let client = new TorcsClient(host, port, maxDamageSetting, verboseLevel);
client.start();

