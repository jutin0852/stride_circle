param(
    [ValidateRange(1, 3600)][int]$IntervalSeconds = 10,
    [string]$RepositoryPath = (Join-Path $PSScriptRoot '..'),
    [switch]$Once
)

# No prompts from background Git authentication; let the user fix credentials separately.
function Invoke-SyncGit {
    param([string]$Path, [string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = @(& git -C $Path @Arguments 2>&1)
        return @{ Code = $LASTEXITCODE; Text = ($lines | ForEach-Object { $_.ToString() }) -join "`n" }
    } finally { $ErrorActionPreference = $previousPreference }
}

function Get-SyncState {
    param([string]$Path)
    $branch = Invoke-SyncGit $Path @('symbolic-ref', '--quiet', '--short', 'HEAD')
    if ($branch.Code -ne 0) { throw 'Detached HEAD: check out the intended tracking branch manually.' }
    $upstream = Invoke-SyncGit $Path @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}')
    if ($upstream.Code -ne 0) { throw "Branch $($branch.Text) has no usable upstream. Configure it manually." }
    $remote = Invoke-SyncGit $Path @('config', '--get', "branch.$($branch.Text).remote")
    if ($remote.Code -ne 0 -or $remote.Text -eq '.') { throw 'An external upstream remote is required.' }
    $head = Invoke-SyncGit $Path @('rev-parse', 'HEAD')
    $target = Invoke-SyncGit $Path @('rev-parse', '@{upstream}')
    $dirty = Invoke-SyncGit $Path @('status', '--porcelain', '--untracked-files=normal')
    if ($head.Code -ne 0 -or $target.Code -ne 0 -or $dirty.Code -ne 0) { throw 'Could not read Git state safely.' }
    $gitDirectory = Invoke-SyncGit $Path @('rev-parse', '--absolute-git-dir')
    if ($gitDirectory.Code -ne 0) { throw 'Could not inspect Git operation state.' }
    foreach ($marker in @('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer')) {
        if (Test-Path -LiteralPath (Join-Path $gitDirectory.Text $marker)) { throw "Git operation in progress ($marker). Finish it manually." }
    }
    return @{ Branch = $branch.Text; Upstream = $upstream.Text; Remote = $remote.Text; Head = $head.Text; Target = $target.Text; Dirty = $dirty.Text }
}

function Invoke-SyncCycle {
    param([string]$Path)
    try { $state = Get-SyncState $Path } catch { return @{ Stop = $false; Message = "PAUSED: $($_.Exception.Message)" } }
    # Fetch origin as requested, plus the actual upstream remote if different.
    foreach ($remote in (@('origin', $state.Remote) | Select-Object -Unique)) {
        $fetch = Invoke-SyncGit $Path @('-c', 'http.lowSpeedLimit=1', '-c', 'http.lowSpeedTime=20', 'fetch', '--quiet', '--no-recurse-submodules', $remote)
        if ($fetch.Code -ne 0) { return @{ Stop = $false; Message = "PAUSED: fetch from $remote failed; check network/authentication. $($fetch.Text)" } }
    }
    try { $state = Get-SyncState $Path } catch { return @{ Stop = $false; Message = "PAUSED: $($_.Exception.Message)" } }
    $counts = Invoke-SyncGit $Path @('rev-list', '--left-right', '--count', 'HEAD...@{upstream}')
    if ($counts.Code -ne 0) { return @{ Stop = $false; Message = 'PAUSED: could not compare branch history.' } }
    $ahead, $behind = $counts.Text.Trim() -split '\s+'
    if ([int]$ahead -gt 0 -and [int]$behind -gt 0) { return @{ Stop = $true; Message = "STOPPED: $($state.Branch) diverged from $($state.Upstream). Resolve history manually; no merge/reset performed." } }
    if ($state.Dirty) { return @{ Stop = $false; Message = 'PAUSED: waiting for a clean working tree (including untracked files). Local work is preserved.' } }
    if ([int]$ahead -gt 0) { return @{ Stop = $false; Message = 'PAUSED: local commits are ahead of upstream. Resolve/push them manually.' } }
    if ([int]$behind -eq 0) { return @{ Stop = $false; Message = "Up to date: $($state.Branch) -> $($state.Upstream)." } }
    # Recheck immediately before mutation; never update a switched branch or changed HEAD.
    try { $current = Get-SyncState $Path } catch { return @{ Stop = $false; Message = "PAUSED: $($_.Exception.Message)" } }
    if ($current.Dirty -or $current.Head -ne $state.Head -or $current.Branch -ne $state.Branch -or $current.Target -ne $state.Target -or $current.Upstream -ne $state.Upstream) {
        return @{ Stop = $false; Message = 'PAUSED: repository changed during synchronization; will recheck next cycle.' }
    }
    $update = Invoke-SyncGit $Path @('merge', '--ff-only', '--no-edit', $state.Target)
    if ($update.Code -ne 0) { return @{ Stop = $true; Message = "STOPPED: fast-forward failed. No automatic recovery attempted. $($update.Text)" } }
    return @{ Stop = $false; Message = "UPDATED: $($state.Branch) from $($state.Upstream) to $($state.Target.Substring(0, 8))." }
}

# Dot-source only the functions for isolated regression tests.
if ($MyInvocation.InvocationName -eq '.') { return }
$oldPrompt = $env:GIT_TERMINAL_PROMPT
$oldInteractive = $env:GCM_INTERACTIVE
try {
    $env:GIT_TERMINAL_PROMPT = '0'
    $env:GCM_INTERACTIVE = 'Never'
    $root = Invoke-SyncGit $RepositoryPath @('rev-parse', '--show-toplevel')
    if ($root.Code -ne 0) { throw "Repository detection failed: $($root.Text)" }
    Write-Host "Cloud sync: $($root.Text); checking every ${IntervalSeconds}s. Ctrl+C stops."
    $lastMessage = ''
    do {
        $result = Invoke-SyncCycle $root.Text
        if ($result.Message -ne $lastMessage) { Write-Host $result.Message; $lastMessage = $result.Message }
        if ($result.Stop) { exit 1 }
        if (-not $Once) { Start-Sleep -Seconds $IntervalSeconds }
    } while (-not $Once)
} finally {
    $env:GIT_TERMINAL_PROMPT = $oldPrompt
    $env:GCM_INTERACTIVE = $oldInteractive
}
