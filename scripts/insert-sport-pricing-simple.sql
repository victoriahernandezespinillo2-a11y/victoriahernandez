-- Insertar precios por deporte para la cancha TEST 1 NO UTILIZAR
-- Primero, obtener el ID de la cancha
WITH court_info AS (
    SELECT id FROM courts WHERE name = 'TEST 1 NO UTILIZAR' LIMIT 1
)
-- Eliminar precios existentes para evitar duplicados
DELETE FROM court_sport_pricing 
WHERE court_id = (SELECT id FROM court_info);

-- Insertar nuevos precios por deporte
WITH court_info AS (
    SELECT id FROM courts WHERE name = 'TEST 1 NO UTILIZAR' LIMIT 1
)
INSERT INTO court_sport_pricing (id, court_id, sport, price_per_hour)
SELECT 
    gen_random_uuid(),
    court_info.id,
    sport_data.sport,
    sport_data.price
FROM court_info,
(VALUES 
    ('FOOTBALL', 15.00),
    ('VOLLEYBALL', 12.50),
    ('BASKETBALL', 13.00),
    ('FUTSAL', 14.00)
) AS sport_data(sport, price)
WHERE court_info.id IS NOT NULL;
