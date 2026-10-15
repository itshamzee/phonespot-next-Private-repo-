-- Tillad husholdningsapparater (Dyson, Roborock, iRobot, Nespresso, De'Longhi) i reparationskataloget.
alter table repair_brands drop constraint if exists repair_brands_device_type_check;
alter table repair_brands add constraint repair_brands_device_type_check
  check (device_type = any (array['smartphone','tablet','laptop','watch','console','appliance']));
