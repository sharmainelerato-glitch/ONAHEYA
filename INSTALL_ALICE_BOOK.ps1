# Run in your ONAHEYA project root (the folder containing public and src).
$ErrorActionPreference = "Stop"
$folder = Join-Path (Get-Location) "public\books"
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$destination = Join-Path $folder "alice-in-wonderland.txt"
$urls = @(
  "https://www.gutenberg.org/cache/epub/11/pg11.txt",
  "https://www.gutenberg.org/files/11/11-0.txt"
)
$success = $false
foreach ($url in $urls) {
  try {
    Invoke-WebRequest -Uri $url -OutFile $destination -ErrorAction Stop
    $text = Get-Content -Raw -Path $destination -Encoding UTF8
    if ($text -match "Alice.s Adventures in Wonderland" -and $text -match "CHAPTER I") {
      $success = $true
      break
    }
  } catch { Write-Host "Trying alternate Gutenberg source..." }
}
if (-not $success) { throw "Could not download a verified novel TXT. Please use the Plain Text UTF-8 download at https://www.gutenberg.org/ebooks/11" }
Write-Host "Installed novel at $destination"
