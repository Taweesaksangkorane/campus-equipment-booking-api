CREATE TABLE equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  equipmentId TEXT NOT NULL REFERENCES equipment(id),
  borrowerName TEXT NOT NULL CHECK(length(trim(borrowerName)) > 0),
  startAt TEXT NOT NULL,
  endAt TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(length(trim(purpose)) > 0),
  CHECK(startAt < endAt)
);
CREATE INDEX bookings_equipment_time ON bookings(equipmentId, startAt, endAt);
INSERT INTO equipment VALUES ('eq-1', 'Projector A', 'Building 1'), ('eq-2', 'Camera B', 'Building 2');
CREATE TRIGGER bookings_insert_overlap BEFORE INSERT ON bookings
WHEN EXISTS (SELECT 1 FROM bookings WHERE equipmentId = NEW.equipmentId AND startAt < NEW.endAt AND endAt > NEW.startAt)
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_CONFLICT');
END;
CREATE TRIGGER bookings_update_overlap BEFORE UPDATE ON bookings
WHEN EXISTS (SELECT 1 FROM bookings WHERE id != NEW.id AND equipmentId = NEW.equipmentId AND startAt < NEW.endAt AND endAt > NEW.startAt)
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_CONFLICT');
END;
