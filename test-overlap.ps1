$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3012'

Write-Host "1) Solicitando token de depuración..."
$debugBody = @{ email = "user1@example.com"; name = "User One"; role = "USER"; expiresIn = "120m" } | ConvertTo-Json -Depth 5
$tokenResp = Invoke-RestMethod -Method Post -Uri "$base/api/debug/auth-token" -ContentType 'application/json' -Body $debugBody
$token = $tokenResp.data.token
if (-not $token) { throw "No se obtuvo token" }
Write-Host "   OK - Token obtenido"

$headers = @{ Authorization = "Bearer $token" }

Write-Host "2) Obteniendo canchas..."
$courtsResp = Invoke-RestMethod -Method Get -Uri "$base/api/courts" -Headers $headers
$courtId = $courtsResp.courts[0].id
if (-not $courtId) { throw "No se encontró ninguna cancha" }
Write-Host ("   OK - CourtId: {0}" -f $courtId)

$t0 = [DateTime]::UtcNow.Date.AddDays(1).AddHours(9)
$start1 = $t0.ToString('o')
$duration = 60
$body1 = @{ courtId = $courtId; startTime = $start1; duration = $duration } | ConvertTo-Json -Depth 5

Write-Host ("3) Creando reserva base en {0} - duracion {1} min..." -f $start1, $duration)
try {
  $resp1 = Invoke-WebRequest -Method Post -Uri "$base/api/reservations" -Headers $headers -ContentType 'application/json' -Body $body1 -UseBasicParsing
  Write-Host ("   Status: {0}" -f $resp1.StatusCode)
  $resp1Json = $resp1.Content | ConvertFrom-Json
  if ($resp1.StatusCode -ne 201) {
    Write-Host ("   Error: {0}" -f $resp1Json.error)
    Write-Output $resp1.Content
    exit 1
  }
  $res1 = $resp1Json.reservation
  Write-Host ("   OK - Reserva base creada: {0}" -f $res1.id)
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
    try { $json = $content | ConvertFrom-Json } catch { $json = $null }
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host ("   Status: {0}" -f $status)
    $msg = if ($json -and $json.error) { $json.error } else { $content }
    Write-Host ("   Error creando base: {0}" -f $msg)
    exit 1
  } else { throw }
}

$start2 = $t0.AddMinutes(30).ToString('o')
$body2 = @{ courtId = $courtId; startTime = $start2; duration = $duration } | ConvertTo-Json -Depth 5
Write-Host ("4) Creando reserva solapada en {0} - duracion {1} min..." -f $start2, $duration)
try {
  $resp2 = Invoke-WebRequest -Method Post -Uri "$base/api/reservations" -Headers $headers -ContentType 'application/json' -Body $body2 -UseBasicParsing
  Write-Host ("   Status: {0}" -f $resp2.StatusCode)
  $resp2Json = $resp2.Content | ConvertFrom-Json
  if ($resp2.StatusCode -eq 201) {
    Write-Host "   ADVERTENCIA - Se creó una reserva solapada (esperado 409)"
    Write-Host ("   ID: {0}" -f $resp2Json.reservation.id)
  } else {
    Write-Host ("   Estado inesperado: {0}" -f $resp2.StatusCode)
    Write-Output $resp2.Content
  }
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
    try { $json = $content | ConvertFrom-Json } catch { $json = $null }
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host ("   Status: {0}" -f $status)
    if ($status -eq 409) {
      $msg = if ($json -and $json.error) { $json.error } else { $content }
      Write-Host ("   OK - Conflicto detectado correctamente: {0}" -f $msg)
    } else {
      Write-Host "   Error inesperado:"
      Write-Output $content
    }
  } else { throw }
}