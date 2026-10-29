# ha-tv-kit · send a test pop-up to a TV running TvOverlay (port 5001, no authentication).
# Usage:  .\test-popup.ps1 -Tv 192.168.1.60 [-Message "Hello"]
param(
  [Parameter(Mandatory)][string]$Tv,
  [string]$Message = 'Pop-ups work'
)
$body = @{ title = 'ha-tv-kit test'; message = $Message; smallIcon = 'mdi:television'; corner = 'top_end'; duration = 10 } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "http://${Tv}:5001/notify" -ContentType 'application/json' -Body $body -TimeoutSec 8 | Out-Null
  Write-Host "Sent. Look at the TV's top-right corner." -ForegroundColor Green
} catch {
  Write-Host "No answer from ${Tv}:5001. Is TvOverlay installed, opened once and allowed to draw over apps (tweaks.ps1 -TvOverlay)?" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}
