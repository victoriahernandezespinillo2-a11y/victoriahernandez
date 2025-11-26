-- Verificar la cancha TEST 1 NO UTILIZAR y sus precios por deporte
SELECT 
    c.id,
    c.name,
    c.is_multiuse,
    c.allowed_sports,
    c.primary_sport,
    c.base_price_per_hour,
    csp.sport,
    csp.price_per_hour as sport_price
FROM courts c
LEFT JOIN court_sport_pricing csp ON c.id = csp.court_id
WHERE c.name = 'TEST 1 NO UTILIZAR'
ORDER BY csp.sport;
