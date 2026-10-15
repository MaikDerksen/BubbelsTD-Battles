# Erzeugt die Sprecher-Spuren für das Promo-Video mit einer Windows-Stimme (offline).
# Aufruf:  powershell -ExecutionPolicy Bypass -File tools\promo\make-voice.ps1 [-Voice Stefan]
param([string]$Voice = 'Stefan')

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here 'vo'
New-Item -ItemType Directory -Force $out | Out-Null

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) {
  $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}
[Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$Voice*" } | Select-Object -First 1
if (-not $v) { throw "Stimme '$Voice' nicht gefunden" }
$synth.Voice = $v

$lines = Get-Content (Join-Path $here 'vo-script.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($l in $lines) {
  $txt = [System.Security.SecurityElement]::Escape($l.text)
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='de-DE'><voice name='$($v.DisplayName)'><prosody rate='+12%' pitch='+6%' volume='loud'>$txt</prosody></voice></speak>"
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $n = [uint32]$stream.Size
  Await ($reader.LoadAsync($n)) ([uint32]) | Out-Null
  $bytes = New-Object byte[] $n
  $reader.ReadBytes($bytes)
  $file = Join-Path $out ($l.id + '.wav')
  [IO.File]::WriteAllBytes($file, $bytes)
  Write-Output ("{0}  {1:N0} KB" -f $l.id, ($n / 1KB))
}
