-- Script para agregar precios por deporte a la cancha TEST 1 NO UTILIZAR

-- Primero, verificar que la cancha existe
SELECT id, name, is_multiuse, allowed_sports, primary_sport 
FROM courts 
WHERE name ILIKE '%TEST 1%';

-- Insertar precios por deporte para la cancha TEST 1 NO UTILIZAR
-- Asumiendo que el ID de la cancha es el que aparece en el resultado anterior

-- Obtener el ID de la cancha
WITH court_info AS (
  SELECT id as court_id 
  FROM courts 
  WHERE name ILIKE '%TEST 1%' 
  LIMIT 1
)
-- Insertar precios por deporte
INSERT INTO court_sport_pricing (court_id, sport, price_per_hour)
SELECT 
  court_id,
  sport,
  price
FROM court_info
CROSS JOIN (
  VALUES 
    ('VOLLEYBALL', 5.00),
    ('BASKETBALL', 8.00),
    ('FUTSAL', 12.00)
) AS sports(sport, price)
ON CONFLICT (court_id, sport) 
DO UPDATE SET 
  price_per_hour = EXCLUDED.price_per_hour;

-- Verificar que se insertaron correctamente
SELECT 
  c.name,
  csp.sport,
  csp.price_per_hour
FROM courts c
JOIN court_sport_pricing csp ON c.id = csp.court_id
WHERE c.name ILIKE '%TEST 1%'
ORDER BY csp.sport;
