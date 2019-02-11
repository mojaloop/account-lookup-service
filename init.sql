/*
 * (C)2018 ModusBox Inc.
 * =====================
 * Project: Casablanca
 * Original Author: Matt Kingston
 * Description: This script creates database entities required by the Casablanca Central Directory Service
 */

CREATE TABLE IF NOT EXISTS participantMno (
    `participantMnoId` int(10) unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'Surrogate PK',
    `mobileCountryCode` SMALLINT unsigned NOT NULL COMMENT 'The three digit code representing the MCC returned by Pathfinder',
    `mobileNetworkCode` SMALLINT unsigned NOT NULL COMMENT 'The three digit code representing the MNC returned by Pathfinder',
    `participantId` int(10) unsigned NOT NULL UNIQUE,
    CONSTRAINT participantmno_participantid_foreign FOREIGN KEY (participantId)
        REFERENCES participant (participantId),
    CONSTRAINT participantmno_participantid_mcc_mnc_unique_key
        UNIQUE INDEX (participantId, mobileCountryCode, mobileNetworkCode),
    CONSTRAINT participantmno_mobilecountrycode_mobilenetworkcode_unique
        UNIQUE (mobileCountryCode, mobileNetworkCode)
);