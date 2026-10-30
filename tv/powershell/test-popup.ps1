# ha-tv-kit · send a test pop-up to a TV.
# Usage:
#   .\test-popup.ps1 -Tv 192.168.1.60                        # port 5001: TV Kiosk's TvOverlay-compatible mode, or TvOverlay (no token)
#   .\test-popup.ps1 -Tv 192.168.1.60 -Token <tv-kiosk-token> # port 2424: TV Kiosk's API with its token
param(
  [Parameter(Mandatory)][string]$Tv,
  [string]$Message = 'Pop-ups work',
  [string]$Token
)
$body = @{ title = 'ha-tv-kit test'; message = $Message; smallIcon = 'mdi:television'; corner = 'top_end'; duration = 10 } | ConvertTo-Json
$req = @{ Method = 'Post'; ContentType = 'application/json'; Body = $body; TimeoutSec = 8 }
if ($Token) { $req.Uri = "http://${Tv}:2424/api/v1/notify"; $req.Headers = @{ Authorization = "Bearer $Token" } }
else { $req.Uri = "http://${Tv}:5001/notify" }
try {
  Invoke-RestMethod @req | Out-Null
  Write-Host "Sent. Look at the TV's top-right corner." -ForegroundColor Green
} catch {
  Write-Host "No answer from $($req.Uri)." -ForegroundColor Red
  if ($Token) { Write-Host 'Is TV Kiosk running, is the token current, and is the API port still 2424 (its Settings)?' -ForegroundColor Red }
  else { Write-Host "Is TV Kiosk's TvOverlay-compatible mode on (or TvOverlay installed and opened once), and allowed to draw over apps (tweaks.ps1 -TvKiosk / -TvOverlay)?" -ForegroundColor Red }
  Write-Host $_.Exception.Message
  exit 1
}
