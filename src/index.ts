import { TorcsClient } from "./TorcsClient";

let verboseLevel = 0;
let host;
let port;
let driver;

let argc = process.argv.length
if (argc > 1) {
  for (let i=1; i < argc; i++) {
    switch (process.argv[i]) {
      case '--host':
        host = process.argv[++i];
        break;
      case '--port':
        port = parseInt(process.argv[++i]);
        break;
      case '--driver':
        driver = process.argv[++i];
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
        break;
    }
  }
} 

function displayHelp() {
  console.log(' --host    <hostname or ipaddress, default = localhost');
  console.log(' --port    <port number, default=3001' );
  console.log(' --driver  <driver model>');
  console.log(' --verbose1  basic info');
  console.log(' --verbose2  detailed info');
  console.log(' -h        display this info');
}

let client = new TorcsClient(driver, host, port, verboseLevel);
client.start();

