param(
  [ValidateSet('api', 'mini', 'all')]
  [string]$Target = 'all'
)

$root = 'merchant-booking'

function Stop-ByPatterns([string[]]$Patterns) {
  if ($Patterns.Count -eq 0) { return }
  $regex = ($Patterns | ForEach-Object { [regex]::Escape($_) }) -join '|'
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match $root -and
      $_.CommandLine -match $regex
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

$apiPatterns = @(
  'dev:api',
  '@merchant-booking/api dev',
  'nest start --watch'
)

$miniPatterns = @(
  'dev:mini',
  'dev:mp-weixin',
  '@merchant-booking/mini dev',
  'uni -p mp-weixin'
)

if ($Target -eq 'api' -or $Target -eq 'all') {
  Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Stop-ByPatterns $apiPatterns
}

if ($Target -eq 'mini' -or $Target -eq 'all') {
  Stop-ByPatterns $miniPatterns
}

Start-Sleep -Milliseconds 500
