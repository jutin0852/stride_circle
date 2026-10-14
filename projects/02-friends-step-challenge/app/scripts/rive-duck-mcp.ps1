param([string]$Tool='tools/list',[string]$Arguments='{}',[string]$Names='')
$ErrorActionPreference='Stop'
$uri='http://127.0.0.1:9791/mcp'
$headers=@{Accept='application/json, text/event-stream'}
function Request($body) {
  $response=Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body ($body|ConvertTo-Json -Depth 100 -Compress) -TimeoutSec 45
  $json=(($response.Content -split "`n" | Where-Object {$_ -like 'data:*'}) -replace '^data:\s*','') -join "`n"
  if(-not $json){$json=$response.Content}
  if($json){$json|ConvertFrom-Json}
}
$init=Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"Codex","version":"1.0"}}}' -TimeoutSec 10
$headers['Mcp-Session-Id']=$init.Headers['Mcp-Session-Id'][0]
Request @{jsonrpc='2.0';method='notifications/initialized'} | Out-Null
if($Tool -eq 'tools/list') {
  $result=Request @{jsonrpc='2.0';id=2;method='tools/list';params=@{}}
  if($Names){$result.result.tools|Where-Object {$_.name -in ($Names -split ',')}|ConvertTo-Json -Depth 100}
  else {$result.result.tools|Select-Object name|ConvertTo-Json}
} else {
  Request @{jsonrpc='2.0';id=2;method='tools/call';params=@{name=$Tool;arguments=($Arguments|ConvertFrom-Json)}}|ConvertTo-Json -Depth 100
}
