/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit */

/**
 * Create a new property
 * @param {com.reliancenetwork.ats.AccelerationReading} tx
 * @transaction
 */

async function AccelerationReading(tx) {
  const factory = getFactory();
  const me = getCurrentParticipant();

  let shipment = tx.shipment;
  let contract = tx.shipment.contract;

  //Assumption: Calculating total Acceleration from root of sum of squares of acceleration component in each axis.
  const accelerationMagnitude = Math.sqrt(tx.accelerationX * tx.accelerationX +
    tx.accelerationY * tx.accelerationY +
    tx.accelerationZ * tx.accelerationZ);


  //Check acceleration Maginitude with that of allowed limit in the contract
  if (accelerationMagnitude >= contract.maximumAcceleration) {
    let event = getFactory().newEvent('com.reliancenetwork.ats', 'AccelerationThreshold');
    event.accelerationX = tx.accelerationX;
    event.accelerationY = tx.accelerationY;
    event.accelerationZ = tx.accelerationZ;
    event.message = "Acceleration Breached";
    event.latitude = tx.latitude;
    event.longitude = tx.longitude;
    event.readingTime = new Date();
    event.shipment = shipment;
    emit(event);
  }

  //Adding this transaction in Acceleration Readings of shipment
  const shipmentRegistry = await getAssetRegistry('com.reliancenetwork.ats.Shipment');
  shipment.accelerationReadings.push(tx);
  await shipmentRegistry.update(shipment);
}
