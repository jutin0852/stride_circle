$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'cloud-sync.ps1')

function Assert-Sync($Condition, [string]$Label) {
    if (-not $Condition) { throw "FAIL: $Label" }
    Write-Host "PASS: $Label"
}
function Test-Git([string]$Path, [string[]]$Arguments) {
    $result = Invoke-SyncGit $Path $Arguments
    if ($result.Code -ne 0) { throw "Fixture Git failure: $($result.Text)" }
    return $result.Text
}
function Save-Fixture([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText((Join-Path $Path 'sample.txt'), $Text)
    $null = Test-Git $Path @('add', '--', 'sample.txt')
    $null = Test-Git $Path @('-c', 'user.name=Sync Test', '-c', 'user.email=sync-test@example.invalid', 'commit', '--quiet', '-m', $Text)
}

$fixture = Join-Path ([IO.Path]::GetTempPath()) ('stride-cloud-sync-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $fixture
$remote = Join-Path $fixture 'remote.git'
$cloud = Join-Path $fixture 'cloud'
$mirror = Join-Path $fixture 'mirror'
try {
    $null = Test-Git $fixture @('init', '--bare', '--quiet', $remote)
    $null = Test-Git $fixture @('clone', '--quiet', $remote, $cloud)
    $null = Test-Git $cloud @('checkout', '-b', 'testing-mirror')
    Save-Fixture $cloud 'initial'
    $null = Test-Git $cloud @('push', '--quiet', '-u', 'origin', 'testing-mirror')
    $null = Test-Git $fixture @('clone', '--quiet', '--branch', 'testing-mirror', $remote, $mirror)
    $state = Get-SyncState $mirror
    Assert-Sync ($state.Branch -eq 'testing-mirror') 'dynamic branch detection (not main)'
    Assert-Sync ($state.Upstream -eq 'origin/testing-mirror') 'correct upstream detection'
    $root = Test-Git $mirror @('rev-parse', '--show-toplevel')
    Assert-Sync ($root.Replace('/', '\') -eq $mirror.Replace('/', '\')) 'repository root detection'
    $first = Invoke-SyncCycle $mirror
    $second = Invoke-SyncCycle $mirror
    Assert-Sync ($first.Message -like 'Up to date:*' -and $first.Message -eq $second.Message) 'stable no-update message (watcher suppresses repetitions)'
    Save-Fixture $cloud 'cloud update'
    $null = Test-Git $cloud @('push', '--quiet')
    [IO.File]::WriteAllText((Join-Path $mirror 'local-notes.txt'), 'untracked local work')
    $before = (Get-SyncState $mirror).Head
    $dirty = Invoke-SyncCycle $mirror
    Assert-Sync ($dirty.Message -like 'PAUSED: waiting for a clean*' -and (Get-SyncState $mirror).Head -eq $before) 'untracked work blocks pending update'
    Remove-Item -LiteralPath (Join-Path $mirror 'local-notes.txt')
    [IO.File]::WriteAllText((Join-Path $mirror 'sample.txt'), 'tracked local work')
    $dirty = Invoke-SyncCycle $mirror
    Assert-Sync ($dirty.Message -like 'PAUSED: waiting for a clean*' -and [IO.File]::ReadAllText((Join-Path $mirror 'sample.txt')) -eq 'tracked local work') 'tracked modifications preserved'
    # Restore our fixture content only, never user files.
    [IO.File]::WriteAllText((Join-Path $mirror 'sample.txt'), 'initial')
    $updated = Invoke-SyncCycle $mirror
    $state = Get-SyncState $mirror
    Assert-Sync ($updated.Message -like 'UPDATED:*' -and $state.Head -eq $state.Target) 'new cloud commit fast-forwards clean mirror'
    $parents = Test-Git $mirror @('rev-list', '--parents', '-n', '1', 'HEAD')
    Assert-Sync (($parents -split '\s+').Count -eq 2) 'update creates no merge commit'
    Save-Fixture $mirror 'local commit'
    Assert-Sync ((Invoke-SyncCycle $mirror).Message -like 'PAUSED: local commits*') 'local-ahead commits pause synchronization'
    Save-Fixture $cloud 'diverging cloud commit'
    $null = Test-Git $cloud @('push', '--quiet')
    $before = (Get-SyncState $mirror).Head
    $diverged = Invoke-SyncCycle $mirror
    Assert-Sync ($diverged.Stop -and (Get-SyncState $mirror).Head -eq $before) 'divergence stops without merge/reset'
    $null = Test-Git $mirror @('remote', 'set-url', 'origin', (Join-Path $fixture 'missing.git'))
    $failure = Invoke-SyncCycle $mirror
    Assert-Sync (-not $failure.Stop -and $failure.Message -like 'PAUSED: fetch*') 'fetch failure pauses without terminating watcher'
    $null = Test-Git $mirror @('checkout', '--detach', '--quiet')
    Assert-Sync ((Invoke-SyncCycle $mirror).Message -like 'PAUSED: Detached HEAD*') 'detached HEAD blocks updates'
    $null = Test-Git $mirror @('checkout', '--quiet', 'testing-mirror')
    $null = Test-Git $mirror @('branch', '--unset-upstream')
    Assert-Sync ((Invoke-SyncCycle $mirror).Message -like 'PAUSED:*no usable upstream*') 'missing upstream blocks updates'
    Write-Host 'All sync safety checks passed. No GitHub or application repository writes performed.'
} finally {
    # Delete only the exact disposable directory created above.
    $resolved = [IO.Path]::GetFullPath($fixture)
    $expectedParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/')
    if ([IO.Path]::GetDirectoryName($resolved) -eq $expectedParent -and [IO.Path]::GetFileName($resolved).StartsWith('stride-cloud-sync-')) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
