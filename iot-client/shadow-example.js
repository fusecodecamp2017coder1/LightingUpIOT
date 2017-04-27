const iot = require('aws-iot-device-sdk');
const _ = require('underscore');

// Simulate the interaction of a mobile device and a remote thing via the
// AWS IoT service.  The remote thing will be a dimmable color lamp, where
// the individual RGB channels can be set to an intensity between 0 and 255.  
// One process will simulate each side, with testMode being used to distinguish 
// between the mobile app (1) and the remote thing (2).  The remote thing
// will update its state periodically using an 'update thing shadow' operation,
// and the mobile device will listen to delta events to receive the updated
// state information.
const operationTimeout = 10000;
const thingName = 'LightBulb';
var currentInterval = null;
var isPretendingToBeAMobileApp = process.argv[2] === 'mobile';
var shadowDetails = {
  keyPath: '../iot/certificate/LightBulb.private.key',
  certPath: '../iot/certificate/LightBulb.cert.pem',
  caPath: '../iot/certificate/root-CA.crt',
  clientId: 'arn:aws:iot:us-east-1:358646606333:' + (isPretendingToBeAMobileApp ? 'phone' : 'thing'),
  region: 'us-east-1',
  host: 'a1vb512hpb4stb.iot.us-east-1.amazonaws.com'
};
const thingShadows = iot.thingShadow(shadowDetails);
var stack = [];

(function initialize() {
   (isPretendingToBeAMobileApp ? mobileAppConnect : deviceConnect)();
})();

function updateShadowState() {
   var newState = generateRandomState();

   console.log('trying to send a new state: ' + JSON.stringify(newState));

   var clientToken = thingShadows.update(thingName, newState);
   console.log('clientToken is: ' + clientToken);
   if (clientToken !== null) {
      stack.push(clientToken);
   } else {
      console.log('operation already in progress, will retry in a moment');
   }
}

function generateRandomState() {
   return {state: {desired: {
      red: Math.floor(Math.random() * 255),
      green: Math.floor(Math.random() * 255),
      blue: Math.floor(Math.random() * 255)
   }}};
}

function mobileAppConnect() {
   thingShadows.register(thingName, { ignoreDeltas: false }, handleRegisterComplete);
}

function deviceConnect() {
   thingShadows.register(thingName, { ignoreDeltas: true }, handleRegisterComplete);
}

function handleRegisterComplete(err, failedTopics) {
   if (err || failedTopics) return;

   var typeOfThing = isPretendingToBeAMobileApp ? 'Mobile' : 'Device';
   console.log(typeOfThing + ' thing registered.');
   if (!isPretendingToBeAMobileApp) startSendingUpdates();
}

function handleStatus(thingName, stat, clientToken, stateObject) {
   console.log('Event [status]');

   var expectedClientToken = stack.pop();
   if (expectedClientToken === clientToken) {
      console.log('got \'' + stat + '\' status on: ' + thingName);
   } else {
      console.log('(status) client token mismtach on: ' + thingName);
   }
}

function handleDelta(thingName, stateObject) {
   if (!isPretendingToBeAMobileApp) {
      console.log('unexpected delta in device mode: ' + thingName);
   } else {
      console.log('delta on: ' + thingName + JSON.stringify(stateObject));
   }
}

function handleTimeout(thingName, clientToken) {
   var expectedClientToken = stack.pop();
   if (expectedClientToken === clientToken) {
      console.log('timeout on: ' + thingName);
   } else {
      console.log('(timeout) client token mismtach on: ' + thingName);
   }
}

function handleClose() {
   console.log('close');
   thingShadows.unregister(thingName);
}

function handleOffline() {
   stopSendingUpdates();   
   console.log('offline');
}

function startSendingUpdates() {
   if (currentInterval) return;
   currentInterval = setInterval(updateShadowState, 10000);
}

function stopSendingUpdates() {
   if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
   }

   while (stack.length) stack.pop();
}

function handleMessage(topic, payload) {
   console.log('message', topic, payload.toString());
}

thingShadows.on('close', handleClose);
thingShadows.on('connect', logEvent('connected to AWS IoT'));
thingShadows.on('reconnect', logEvent('reconnect'));
thingShadows.on('error', logEvent('error'));
thingShadows.on('offline', handleOffline);
thingShadows.on('message', handleMessage);
thingShadows.on('status', handleStatus);
thingShadows.on('delta', handleDelta);
thingShadows.on('timeout', handleTimeout);

function logEvent(eventType) {
   return function () {
      console.log('Event [' + eventType + ']');
   };
}
