BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "accessories" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"name"	TEXT NOT NULL,
	"description" TEXT NOT NULL,
	"price"	INTEGER NOT NULL CHECK("price" > 0),
	"availability" INTEGER CHECK("availability" > 0),
	"mandatory"	INTEGER,
	FOREIGN KEY("mandatory") REFERENCES "accessories"("id")
);

CREATE TABLE IF NOT EXISTS "models" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"name"	TEXT NOT NULL,
    "power" INTEGER NOT NULL CHECK("power" IN (50, 100, 150)),
	"price"	INTEGER NOT NULL CHECK("price" > 0),
	"max_number" INTEGER CHECK("max_number" > 0)
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL UNIQUE,
  "hash"	TEXT NOT NULL,
  "salt"	TEXT NOT NULL,
  "owner"   INTEGER CHECK ("owner" = 1),
  "quality" BOOLEAN NOT NULL CHECK("quality" IN (0, 1))
);

CREATE TABLE IF NOT EXISTS "incompats" (
	"accessory" INTEGER NOT NULL,
	"incompat"	INTEGER NOT NULL CHECK("incompat" <> "accessory"),
	PRIMARY KEY("accessory","incompat"),
	FOREIGN KEY("incompat") REFERENCES "accessories"("id"),
	FOREIGN KEY("accessory") REFERENCES "accessories"("id")
);

CREATE TABLE IF NOT EXISTS "car_configurations" (
	"user_id" INTEGER NOT NULL,
	"model_id" INTEGER NOT NULL,
	PRIMARY KEY("user_id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id"),
	FOREIGN KEY("model_id") REFERENCES "models"("id")
);

CREATE TABLE IF NOT EXISTS "selected_accessories" (
	"user_id" INTEGER NOT NULL,
	"accessory_id" INTEGER NOT NULL,
	PRIMARY KEY("user_id", "accessory_id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id"),
	FOREIGN KEY("accessory_id") REFERENCES "accessories"("id")
);

-- Insert accessories
INSERT INTO "accessories" ("name", "description", "price", "availability", "mandatory") VALUES 
('Radio', 'High-quality standard car radio system for an enhanced audio experience', 300, 10, NULL),
('Satellite Navigator', 'Cutting-edge GPS navigation system with real-time traffic updates', 600, 10, 3),
('Bluetooth', 'Seamless Bluetooth connectivity for hands-free calls and audio streaming', 200, 10, 1),
('Power Windows', 'Convenient automatic power windows with one-touch operation', 200, 10, NULL),
('Extra Front Lights', 'Bright additional front lights for improved visibility in low-light conditions', 150, 10, NULL),
('Extra Rear Lights', 'Enhanced rear lighting system for better safety and visibility', 150, 10, 5),
('Air Conditioning', 'Efficient automatic air conditioning system to keep the cabin cool', 600, 3, 4),
('Spare Tire', 'Durable spare tire for emergency situations, ensuring peace of mind', 200, 10, NULL),
('Assisted Driving', 'Advanced assisted driving system with multiple safety features', 1200, 2, NULL),
('Automatic Braking', 'Reliable automatic braking system to prevent collisions and enhance safety', 800, 3, NULL);


-- Insert models
INSERT INTO "models" ("name", "power", "price", "max_number") VALUES 
('Ford Gran Torino', 50, 10000, 4),
('1964 Aston Martin DB5', 100, 12000, 5),
('DeLorean DMC-12', 150, 14000, 7),
('KITT', 150, 14000, 7),
('1964 Chevrolet Chevelle Malibu', 100, 12000, 5);

-- Insert data into users
INSERT INTO "users" ("username", "hash", "salt", "owner", "quality") VALUES 
('pepitosann', '1f1d5214763ccc27304465a6c88505a6b9ccd2b2f07b9c6e05ecd280b2a21253', '96a0f4e845fc918f5400b4e92ed0d345', 1, 1),
('luca', 'b470ede82433afa01946c39103cd1e99692eba143d021f8478bd0bf010e53bc6', 'cef0009f306c0743825d0a4d82b936cd', NULL, 0),
('saimon', '8e42c9de4565fe3541f072582532687242d38670d1f97ec0bf54c7654d2e1aef', 'cc87df425167e7e0d33555d096e11c2b', NULL, 0),
('cricod', 'fd7767ae5d1867d86c130589fadc676787e9c74198a2c7925f5e5d132a430225', '2cafabadd7d7fadf9c8e41c65133e45f', 1, 1),
('elidegiu', '9bd60ac4a45684b2c2fbd5c0b936a3bb65a87d4548e8b49e10c48819678392f8', '1d68f9281e66b5b48e54b4978507da3a', 1, 0);

-- Insert data into incompats
INSERT INTO "incompats" ("accessory", "incompat") VALUES 
(9, 10), 
(8, 7),
(10, 9),
(7, 8);

INSERT INTO "car_configurations" ("user_id", "model_id") VALUES
(5, 5),
(1, 3),
(4, 1);

INSERT INTO "selected_accessories" ("user_id", "accessory_id") VALUES
(5, 1),
(5, 3),
(5, 4),
(5, 2),
(5, 7),
(1, 10),
(1, 5),
(1, 6),
(1, 1),
(1, 3),
(1, 4),
(1, 7);

COMMIT;