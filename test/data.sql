INSERT INTO Company (name, tel, url) VALUES
('Apple Inc.', '408-996-1010', 'http://www.apple.com'),
('Amazon', '888-280-3321', 'http://www.amazon.com'),
('COIMOTION', '408-970-1248', 'http://www.coimotion.com'),
('Facebook', '408-535-7605', 'http://www.facebook.com'),
('Napster', '408-575-1235', 'http://rhapsody.com'),
('Netflix', '866-579-7172', 'http://www.netflix.com'),
('Spotify', '213-707-8846', 'http://www.spotify.com'),
('Tesla', '877-798-3752', 'http://www.teslamotors.com');

INSERT INTO Person (name, dob, gender, workFor) VALUES
('Mike', '1978-02-12', 1, 4),
('Stacy', '1965-12-30', 0, 3),
('Mark', '1982-10-05', 1, 8),
('Johnson', '1962-08-10', 1, 6),
('Eugene', '1988-05-20', 1, 1),
('Kate', '1982-11-25', 0, 1),
('Chris', '1992-04-21', 1, 3),
('Donald', '1990-01-31', 1, 7),
('Michelle', '1983-03-11', 0, 2),
('Rebecca', '1972-06-25', 0, 5),
('Roger', '1977-07-18', 1, 3);

INSERT INTO PersonDoc (name, dob, gender, workFor) VALUES
('Mike', '1978-02-12', 1, 4),
('Stacy', '1965-12-30', 0, 3),
('Mark', '1982-10-05', 1, 8),
('Johnson', '1962-08-10', 1, 6),
('Eugene', '1988-05-20', 1, 1),
('Kate', '1982-11-25', 0, 1),
('Chris', '1992-04-21', 1, 3),
('Donald', '1990-01-31', 1, 7),
('Michelle', '1983-03-11', 0, 2),
('Rebecca', '1972-06-25', 0, 5),
('Roger', '1977-07-18', 1, 3);

UPDATE Company SET _c_json='{"size":12300, "stock": 120}' WHERE Company_id=1;
UPDATE Company SET _c_json='{"size":8500}' WHERE Company_id=2;
UPDATE Company SET _c_json='{"size":4800, "stock": 880}' WHERE Company_id=3;
UPDATE Company SET _c_json='{"stock":60}' WHERE Company_id=4;
UPDATE Company SET _c_json='{"stock":26}' WHERE Company_id=5;
UPDATE Company SET _c_json='{"size":3200, "stock": 12}' WHERE Company_id=6;
UPDATE Company SET _c_json='{"size":2400, "stock": 25}' WHERE Company_id=7;
UPDATE Company SET _c_json='{"size":5400}' WHERE Company_id=8;

UPDATE Person SET _c_json='{"salary": 110000}' WHERE Person_id=1;
UPDATE Person SET _c_json='{"hobby": "reading", "weight": 220}' WHERE Person_id=2;
UPDATE Person SET _c_json='{"salary": 250000, "weight": 160}' WHERE Person_id=3;
UPDATE Person SET _c_json='{"salary": 120000, "hobby": "hiking"}' WHERE Person_id=4;
UPDATE Person SET _c_json='{"salary": 150000, "hobby": "hiking"}' WHERE Person_id=6;
UPDATE Person SET _c_json='{"weight": 180}' WHERE Person_id=7;
UPDATE Person SET _c_json='{"salary": 80000}' WHERE Person_id=8;
UPDATE Person SET _c_json='{"hobby": "music", "weight": 130}' WHERE Person_id=9;
UPDATE Person SET _c_json='{"salary": 180000, "weight": 140}' WHERE Person_id=10;
UPDATE Person SET _c_json='{"hobby": "reading"}' WHERE Person_id=11;

UPDATE PersonDoc SET _c_json='{"salary": 110000}' WHERE id=1;
UPDATE PersonDoc SET _c_json='{"hobby": "reading", "weight": 220}' WHERE id=2;
UPDATE PersonDoc SET _c_json='{"salary": 250000, "weight": 160}' WHERE id=3;
UPDATE PersonDoc SET _c_json='{"salary": 120000, "hobby": "hiking"}' WHERE id=4;
UPDATE PersonDoc SET _c_json='{"salary": 150000, "hobby": "hiking"}' WHERE id=6;
UPDATE PersonDoc SET _c_json='{"weight": 180}' WHERE id=7;
UPDATE PersonDoc SET _c_json='{"salary": 80000}' WHERE id=8;
UPDATE PersonDoc SET _c_json='{"hobby": "music", "weight": 130}' WHERE id=9;
UPDATE PersonDoc SET _c_json='{"salary": 180000, "weight": 140}' WHERE id=10;
UPDATE PersonDoc SET _c_json='{"hobby": "reading"}' WHERE id=11;