$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Read-EnvFile([string]$path) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $path)) { return $map }
  Get-Content -LiteralPath $path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $map[$Matches[1].Trim()] = $Matches[2].Trim()
    }
  }
  return $map
}

function Get-ApiKeys {
  $map = Read-EnvFile (Join-Path $root ".env")
  $gemini = [string]$map["gemini_api_key"]
  $groq = [string]$map["groq_api_key"]
  if ($groq.StartsWith("image.")) { $groq = $groq.Substring(6) }
  return @{ Gemini = $gemini; Groq = $groq }
}

function Read-ErrorBody($err) {
  try {
    $resp = $err.Exception.Response
    if (-not $resp) { return "" }
    $stream = $resp.GetResponseStream()
    if (-not $stream) { return "" }
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return ""
  }
}

function Write-CoachLog([string]$line) {
  $safe = $line -replace 'AQ\.[A-Za-z0-9_\-]+', '[key]' -replace 'gsk_[A-Za-z0-9]+', '[key]'
  if ($safe.Length -gt 240) { $safe = $safe.Substring(0, 240) }
  Add-Content -LiteralPath (Join-Path $root "coach-debug.log") -Value $safe -Encoding utf8
}
function Get-CoachPrompt($data) {
  $lines = @()
  $lines += "You are an English interview coach helping a Korean student."
  $lines += "Purpose: $($data.purpose)"
  $lines += "Major or role: $($data.major)"
  $lines += "Difficulty: $($data.difficulty)"
  $lines += "Write the summary and notes in Korean. Write each rewrite in natural English."
  $lines += "Return only JSON with this shape:"
  $lines += '{"summary":"2 Korean sentences","turns":[{"note":"1 or 2 Korean sentences","rewrite":"2 to 4 English sentences"}]}'
  $lines += "The turns array must have exactly $($data.turns.Count) items, in the same order."
  $i = 1
  foreach ($turn in $data.turns) {
    $lines += ""
    $lines += "Question ${i}: $($turn.prompt)"
    $lines += "Answer ${i}: $($turn.answer)"
    $i += 1
  }
  return ($lines -join "`n")
}

function Convert-CoachText([string]$text) {
  $clean = $text.Trim()
  if ($clean.StartsWith('```')) {
    $clean = $clean -replace '^```(?:json)?', ''
    $clean = $clean -replace '```$', ''
    $clean = $clean.Trim()
  }
  return $clean | ConvertFrom-Json
}

function Invoke-ApiJson([string]$url, [hashtable]$headers, [string]$body, [int]$timeoutSec) {
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = "POST"
  $req.Timeout = $timeoutSec * 1000
  $req.ReadWriteTimeout = $timeoutSec * 1000
  $req.ContentType = "application/json; charset=utf-8"
  $req.Accept = "application/json"
  foreach ($name in @($headers.Keys)) {
    $req.Headers[[string]$name] = [string]$headers[$name]
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes($body)
  $req.ContentLength = $bytes.Length
  $out = $req.GetRequestStream()
  $out.Write($bytes, 0, $bytes.Length)
  $out.Close()
  $resp = $req.GetResponse()
  try {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
    $text = $reader.ReadToEnd()
    $reader.Close()
  } finally {
    $resp.Close()
  }
  return $text | ConvertFrom-Json
}
function Invoke-Gemini([string]$key, [string]$prompt) {
  $models = @("gemini-3.8-flash")
  $bodyObj = @{
    contents = @(@{ parts = @(@{ text = $prompt }) })
  }
  $body = $bodyObj | ConvertTo-Json -Depth 8
  foreach ($model in $models) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent"
    try {
      $resp = Invoke-ApiJson $url @{ "x-goog-api-key" = $key } $body 12
      $text = ""
      foreach ($part in @($resp.candidates[0].content.parts)) {
        if ($part.thought) { continue }
        if ($part.text) { $text += [string]$part.text }
      }
      if ($text) { return $text }
      Write-CoachLog "gemini $model empty"
    } catch {
      $code = $null
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      Write-CoachLog ("gemini " + $model + " " + $code + " " + $_.Exception.Message + " " + (Read-ErrorBody $_))
      continue
    }
  }
  return $null
}

function Invoke-Groq([string]$key, [string]$prompt) {
  $bodyObj = @{
    model = "openai/gpt-oss-20b"
    temperature = 0.4
    messages = @(@{ role = "user"; content = $prompt })
  }
  $body = $bodyObj | ConvertTo-Json -Depth 8
  try {
    $resp = Invoke-ApiJson "https://api.groq.com/openai/v1/chat/completions" @{ Authorization = "Bearer $key" } $body 25
    return $resp.choices[0].message.content
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-CoachLog ("groq " + $code + " " + $_.Exception.Message + " " + (Read-ErrorBody $_))
    return $null
  }
}

function Send-Json($response, [int]$status, $obj) {
  $json = $obj | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $response.StatusCode = $status
  $response.ContentType = "application/json; charset=utf-8"
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-File($response, [string]$file) {
  $bytes = [IO.File]::ReadAllBytes($file)
  $ext = [IO.Path]::GetExtension($file).ToLower()
  $type = switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    default { "application/octet-stream" }
  }
  $response.StatusCode = 200
  $response.ContentType = $type
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = $null
$prefix = $null
$ports = @(8785) + @(8780..8790 | Where-Object { $_ -ne 8785 })
foreach ($port in $ports) {
  $candidate = "http://127.0.0.1:${port}/"
  $tryListener = New-Object System.Net.HttpListener
  $tryListener.Prefixes.Add($candidate)
  try {
    $tryListener.Start()
    $listener = $tryListener
    $prefix = $candidate
    break
  } catch {
    $tryListener.Close()
  }
}
if (-not $listener) { throw "8780부터 8790까지 사용할 수 있는 포트가 없습니다." }
Write-Output "Interview Coach $prefix"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq "/api/coach" -and $ctx.Request.HttpMethod -eq "POST") {
      $reader = New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)
      $raw = $reader.ReadToEnd()
      $reader.Close()
      $data = $raw | ConvertFrom-Json
      $keys = Get-ApiKeys
      $prompt = Get-CoachPrompt $data
      $provider = $null
      $text = $null
      if ($keys.Gemini) {
        $text = Invoke-Gemini $keys.Gemini $prompt
        if ($text) { $provider = "gemini" }
      }
      if (-not $text -and $keys.Groq) {
        try {
          $text = Invoke-Groq $keys.Groq $prompt
          if ($text) { $provider = "groq" }
        } catch {
          $text = $null
        }
      }
      if (-not $text) {
        Send-Json $ctx.Response 502 @{ error = "coach-unavailable" }
      } else {
        $coach = Convert-CoachText $text
        Send-Json $ctx.Response 200 @{
          provider = $provider
          summary = [string]$coach.summary
          turns = @($coach.turns)
        }
      }
    } else {
      if ($path -eq "/") { $path = "/index.html" }
      $rel = $path.TrimStart("/") -replace "/", "\"
      $file = Join-Path $root $rel
      $fullRoot = [IO.Path]::GetFullPath($root)
      $fullFile = [IO.Path]::GetFullPath($file)
      if ($fullFile.StartsWith($fullRoot) -and (Test-Path -LiteralPath $fullFile -PathType Leaf) -and $rel -ne ".env") {
        Send-File $ctx.Response $fullFile
      } else {
        $ctx.Response.StatusCode = 404
      }
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  } finally {
    try { $ctx.Response.Close() } catch {}
  }
}
