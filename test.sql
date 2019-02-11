
/*
 * (C)2018 ModusBox Inc.
 * =====================
 * Project: Casablanca
 * Original Author: Matt Kingston
 * Description: This script creates test data for the Casablanca Central Directory Service
 */

set autocommit=1;

DELETE FROM `central_ledger`.`participant` where participantId=1;
INSERT INTO `central_ledger`.`participant`(`participantId`,`name`,`description`,`isActive`,`createdDate`,`createdBy`)VALUES(1,'payerfsp','payerfsp',1,CURRENT_TIMESTAMP(),'test');

DELETE FROM `central_ledger`.`participant` where participantId=2;
INSERT INTO `central_ledger`.`participant`(`participantId`,`name`,`description`,`isActive`,`createdDate`,`createdBy`)VALUES(2,'payeefsp','payeefsp',1,CURRENT_TIMESTAMP(),'test');

DELETE FROM `central_ledger`.`participantEndpoint` where participantEndpointId=1;
INSERT INTO `central_ledger`.`participantEndpoint`(`participantEndpointId`,`participantId`,`endpointTypeId`,`value`,`isActive`,`createdDate`,`createdBy`)VALUES(1,1,(SELECT endpointTypeId FROM endpointType WHERE name='FSIOP_CALLBACK_URL'),'http://win-casa-azure-desktop1.mojaloop.live:8444/payerfsp',1,CURRENT_TIMESTAMP(),'test');

DELETE FROM `central_ledger`.`participantEndpoint` where participantEndpointId=2;
INSERT INTO `central_ledger`.`participantEndpoint`(`participantEndpointId`,`participantId`,`endpointTypeId`,`value`,`isActive`,`createdDate`,`createdBy`)VALUES(2,2,(SELECT endpointTypeId FROM endpointType WHERE name='FSIOP_CALLBACK_URL'),'http://win-casa-azure-desktop1.mojaloop.live:8444/payeefsp',1,CURRENT_TIMESTAMP(),'test');

DELETE FROM `central_ledger`.`participantMno` where participantMnoId=1;
INSERT INTO `central_ledger`.`participantMno` (`participantMnoId`,`mobileCountryCode`,`mobileNetworkCode`,`participantId`) VALUES ('1','612','03','1');

DELETE FROM `central_ledger`.`participantMno` where participantMnoId=2;
INSERT INTO `central_ledger`.`participantMno` (`participantMnoId`,`mobileCountryCode`,`mobileNetworkCode`,`participantId`) VALUES ('2','612','05','2');