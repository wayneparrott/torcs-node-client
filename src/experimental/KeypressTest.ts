import * as tty from 'tty'
const keypress: any = require('keypress');

let cnt = 0;

function initKeys(): void {
  console.log('init keys');

  // make `process.stdin` begin emitting "keypress" events
  keypress(process.stdin);
  // listen for the "keypress" event
  process.stdin.on('keypress', function(ch, key) {
    cnt++;
    console.log('got "keypress"', cnt, ch, typeof ch, typeof key, key);
    if (key && key.ctrl && key.name == 'c') {
      process.exit();
    }
  });

  //if (process.stdin.isTTY) {
  console.log('isatty(0)', tty.isatty(0));
  console.log('isatty(1)', tty.isatty(1));
  console.log('isatty(2)', tty.isatty(2));

  if (tty.isatty(1)) {
    console.log('tty');
    let x: tty.ReadStream = <tty.ReadStream>process.stdin;
    x.setRawMode(true);
    //process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

initKeys();
setTimeout(function() { }, 10000);
