param(
  [string]$Container = 'kd-design-starter-postgres-1',
  [Parameter(Mandatory=$true)][string]$ExpectedVolume,
  [string]$Database = 'kd_desgin',
  [string]$DatabaseUser = 'kd',
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [switch]$WritesStopped
)
$ErrorActionPreference = 'Stop'
if (-not $WritesStopped) { throw 'Stop API/admin writes first, then pass -WritesStopped to capture database and images together.' }
$projectDir = Split-Path -Parent $PSScriptRoot
$uploadDir = Join-Path $projectDir 'server\uploads'
if (-not (Test-Path -LiteralPath $uploadDir -PathType Container)) { throw 'server/uploads is missing. Do not claim an image backup.' }
$containerJson = & docker inspect $Container --format '{{json .}}'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker container.' }
$containerInfo = $containerJson | ConvertFrom-Json
if (-not $containerInfo.State.Running) { throw 'Source container is stopped.' }
if (-not ($containerInfo.Mounts | Where-Object { $_.Type -eq 'volume' -and $_.Name -ceq $ExpectedVolume -and $_.Destination -eq '/var/lib/postgresql/data' })) {
  throw 'Source volume does not match ExpectedVolume. Stop and identify the correct source.'
}
$backupBase = [IO.Path]::GetFullPath($BackupRoot)
$projectPrefix = [IO.Path]::GetFullPath($projectDir).TrimEnd('\') + '\'
if (($backupBase.TrimEnd('\') + '\').StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Choose a backup directory outside the Git repository.' }
$backupId = [guid]::NewGuid().ToString('N')
$backupDir = Join-Path $backupBase ('kd-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $backupId.Substring(0,8))
New-Item -ItemType Directory -Path $backupDir | Out-Null
$containerFile = '/tmp/kd-backup-' + $backupId + '.dump'
# pg_dump writes its own binary archive; never pipe binary through Windows PowerShell.
& docker exec -e 'PGOPTIONS=-c default_transaction_read_only=on' $Container pg_dump -U $DatabaseUser -d $Database --format=custom --no-owner --no-privileges --file=$containerFile
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed; this backup is incomplete.' }
& docker exec $Container pg_restore --list $containerFile | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Archive cannot be listed; this backup is incomplete.' }
$dumpPath = Join-Path $backupDir 'database.dump'
& docker cp "${Container}:$containerFile" $dumpPath
if ($LASTEXITCODE -ne 0) { throw 'Cannot copy dump; this backup is incomplete.' }
Copy-Item -LiteralPath $uploadDir -Destination (Join-Path $backupDir 'uploads') -Recurse
$files = @(Get-ChildItem -LiteralPath $backupDir -Recurse -File | ForEach-Object {
  @{ path = $_.FullName.Substring($backupDir.Length + 1); bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
})
@{ createdAt = (Get-Date).ToUniversalTime().ToString('o'); database = $Database; sourceContainer = $Container;
   sourceVolume = $ExpectedVolume; files = $files; archiveListed = $true; restoreTested = $false } |
  ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backupDir 'manifest.json') -Encoding UTF8
Write-Host "Backup written: $backupDir"
Write-Host 'Archive listing and checksums completed. A separate restore test is still required before cloud cutover.'
