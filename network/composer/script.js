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
  if (accelerationMagnitude > contract.maximumAcceleration) {
    let event = getFactory().newEvent('com.reliancenetwork.ats', 'AccelerationThreshold');
    event.accelerationX = tx.accelerationX;
    event.accelerationY = tx.accelerationY;
    event.accelerationZ = tx.accelerationZ;
    event.message = "Acceleration Breached";
    event.latitude = tx.latitude;
    event.longitude = tx.longitude;
    event.readingTime = tx.readingTime || new Date();
    event.shipment = shipment;
    emit(event);
  }

  //Adding this transaction in Acceleration Readings of shipment
  const shipmentRegistry = await getAssetRegistry('com.reliancenetwork.ats.Shipment');
  shipment.accelerationReadings.push(tx);
  await shipmentRegistry.update(shipment);
}

/**
 * Create a new property
 * @param {com.reliancenetwork.ats.TemperatureReading} tx
 * @transaction
 */

async function TemperatureReading(tx) {
  const factory = getFactory();
  const me = getCurrentParticipant();

  let shipment = tx.shipment;
  let contract = tx.shipment.contract;

  //Check temerature with that of allowed limit in the contract
  if (tx.celcius < contract.minimumTemperature || tx.celcius > contract.maximumTemperature) {
    let event = getFactory().newEvent('com.reliancenetwork.ats', 'TemperatureThreshold');
    event.temperature = tx.celcius;
    event.message = "Temperature Breached";
    event.latitude = tx.latitude;
    event.longitude = tx.longitude;
    event.readingTime = tx.readingTime || new Date();
    event.shipment = shipment;
    emit(event);
  }

  //Adding this transaction in Temperature Readings of shipment
  const shipmentRegistry = await getAssetRegistry('com.reliancenetwork.ats.Shipment');
  shipment.temperatureReadings.push(tx);
  await shipmentRegistry.update(shipment);
}

/**
 * Create a new property
 * @param {com.reliancenetwork.ats.GPSReading} tx
 * @transaction
 */

async function GPSReading(tx) {
  const factory = getFactory();
  const me = getCurrentParticipant();

  let shipment = tx.shipment;
  let contract = tx.shipment.contract;

  //Assumption: The address of importer/exporter is stored in format: latitude + latitudeDirection + longitude + longitudeDirection;
  let shipmentCurrentPosition = tx.latitude + tx.latitudeDirection + tx.longitude + tx.longitudeDirection;

  //Check if shipment reached the destination
  if (shipmentCurrentPosition == contract.importer.address) {
    let event = getFactory().newEvent('com.reliancenetwork.ats', 'ShipmentInPort');
    event.message = "Shipment Arrived";
    event.shipment = shipment;
    emit(event);
  }

  //Adding this transaction in GPS Readings of shipment
  const shipmentRegistry = await getAssetRegistry('com.reliancenetwork.ats.Shipment');
  shipment.gpsReadings.push(tx);
  await shipmentRegistry.update(shipment);
}

/**
 * Create a new property
 * @param {com.reliancenetwork.ats.ShipmentReceived} tx
 * @transaction
 */

async function ShipmentReceived(tx) {
  const factory = getFactory();
  const me = getCurrentParticipant();

  let shipment = tx.shipment;
  let contract = tx.shipment.contract;

  let totalPayout = shipment.unitCount * contract.unitPrice;
  shipment.shipmentStatus = "ARRIVED";

  //Setting totalPayout to 0 if shipment is deleyed
  if (new Date().getTime() > new Date(contract.arrivalDateTime).getTime()) {
    totalPayout = 0;
  }

  //Penalty Calculation Logic
  let unitPenaltyFactor = 0;

  // Temperature Penalty Calculation
  shipment.temperatureReadings.forEach(function (temperatureReading) {
    if (temperatureReading.celcius < contract.minimumTemperature) {
      unitPenaltyFactor += (contract.minimumTemperature - temperatureReading.celcius) * contract.minimumPenaltyFactor;
    }

    if (temperatureReading.celcius > contract.maximumTemperature) {
      unitPenaltyFactor += (temperatureReading.celcius - contract.maximumTemperature) * contract.maximumPenaltyFactor;
    }
  });

  // Acceleration Penalty Calculation
  shipment.accelerationReadings.forEach(function (accelerationReading) {
    const accelerationMagnitude = Math.sqrt(accelerationReading.accelerationX * accelerationReading.accelerationX +
      accelerationReading.accelerationY * accelerationReading.accelerationY +
      accelerationReading.accelerationZ * accelerationReading.accelerationZ);
    if (accelerationMagnitude > contract.maximumAcceleration) {
      unitPenaltyFactor += (accelerationMagnitude - contract.maximumAcceleration) * contract.maximumPenaltyFactor;
    }
  });

  let totalPenalty = unitPenaltyFactor * shipment.unitCount;
  totalPayout -= totalPenalty;

  // handling a case where totalPayout can be negative if penaty is levied
  if (totalPayout < 0) {
    totalPayout = 0;
  }

  //Updating Balances
  contract.importer.accountBalance -= totalPayout;
  contract.exporter.accountBalance += (totalPayout / 2);
  contract.shipper.accountBalance += (totalPayout / 2);

  const importerRegistry = await getParticipantRegistry('com.reliancenetwork.ats.Importer');
  await importerRegistry.update(contract.importer);

  const exporterRegistry = await getParticipantRegistry('com.reliancenetwork.ats.Exporter');
  await exporterRegistry.update(contract.exporter);

  const shipperRegistry = await getParticipantRegistry('com.reliancenetwork.ats.Shipper');
  await shipperRegistry.update(contract.shipper);

  //Updating Shipment With the Arrived Status
  const shipmentRegistry = await getAssetRegistry('com.reliancenetwork.ats.Shipment');
  await shipmentRegistry.update(shipment);
}
