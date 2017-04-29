import { Component, NgZone } from '@angular/core';
import { NavController, Platform, Events } from 'ionic-angular';

import { BeaconProvider } from '../../providers/beacon-provider';
import { BeaconModel } from '../../models/beacon-model';
import * as AWS from 'aws-sdk';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  beacons: BeaconModel[] = [];
  zone: NgZone;
  debug_messages: string;
  device: any;
  topic: string = 'light-control';
  beacon_major: number = 49056;
  beacon_minor: number = 47323;
  last_update_sent: Date = new Date();
  light_is_on: boolean;


  constructor(public navCtrl: NavController, public platform: Platform, public beaconProvider: BeaconProvider, public events: Events) {
  	this.debug_messages = "No Debug Message";
    this.zone = new NgZone({ enableLongStackTrace: false });

    console.log(AWS);

    var config = new AWS.Config({
      credentials: new AWS.Credentials({
        accessKeyId: '<key_id>',
        secretAccessKey: '<key>'
      }),
      region: 'us-east-1'
    });

    // TODO: Connect to the device with "AWS.IotData"
    
    this.device = new AWS.IotData({
      credentials: config.credentials,
      region: config.region,
      endpoint: 'a1vb512hpb4stb.iot.us-east-1.amazonaws.com'
    })
  }

  sendCommand(command) {
    // TODO: Publish your command
    this.device.publish(this.getCommand(command));

  }

  getCommand(command) {
    return {
      topic: 'light-control',
      payload: JSON.stringify({ message: command }),
      qos: 0
    };
  }

  handleResult(err, data) {
  }

  ionViewDidLoad() {
    this.platform.ready().then(() => {
  	  this.debug_messages = "Starting to initialize";

      this.beaconProvider.initialize().then((isInitialized) => {
  	  	this.debug_messages = "initialize complete";

        if (isInitialized) {
          this.listenToBeaconEvents();
        }
      });
    });
  }

  listenToBeaconEvents() {
    this.events.subscribe('didRangeBeaconsInRegion', (data) => {
  	  this.debug_messages = "got the beacons in region event";

      this.zone.run(() => {
        let beaconList = data.beacons;
        beaconList.forEach((beacon) => {
          var found = false;
          for (let existingBeacon of this.beacons) {
            if (this.isBeaconWeCareAbout(existingBeacon)) {
              // TODO: Handle what happens when we have found our beacon
              if (Math.abs(existingBeacon.rssi) < 75)
                sendCommand('blue');
              else
                sendCommand('off');
          }

          // TODO: did we find a beacon and what do we want to do?
          // TODO: send a command here when in range
        });
      });
    });
  }

  isBeaconWeCareAbout(beacon) {
    // TODO: Check if this is the beacon we care about
      if (beacon.major == beacon_major && beacon.minor == beacon_minor)
        return true;
      else
        return false;
  }
}