param(
    [ValidateSet('build','plan')]
    [string]$Mode = 'build',
    [int]$MaxIterations = 0,
    [int]$ServerPort = 4097,
    [string]$AttachUrl = '',
    [string]$PromptFile = '',
    [string]$Model = 'github-copilot/gpt-5.4',
    [string]$Agent = 'build',
    [string]$PinnedOpenCodePackage = 'opencode-ai@1.3.17',
    [switch]$UseInstalledOpenCode,
    [switch]$NoServerStart
)

$ErrorActionPreference = 'Stop'

$MinimumOpenCodeVersion = [Version]'1.3.17'
$script:OpenCodeExecutable = 'opencode'
$script:OpenCodeBaseArgs = @()

function Write-Status {
    param([string]$Message)

    Write-Host $Message
}

function Get-AssistantCompletionState {
    param([string]$ExportPath)

    if (-not (Test-Path $ExportPath)) {
        return 'none'
    }

    $raw = Get-Content -Raw -Path $ExportPath
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return 'none'
    }

    $jsonStart = $raw.IndexOf('{')
    $jsonEnd = $raw.LastIndexOf('}')
    if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
        return 'none'
    }

    $jsonPayload = $raw.Substring($jsonStart, $jsonEnd - $jsonStart + 1)

    try {
        $export = $jsonPayload | ConvertFrom-Json
    } catch {
        return 'none'
    }

    if (-not $export.messages) {
        return 'none'
    }

    foreach ($message in $export.messages) {
        if ($message.info.role -ne 'assistant') {
            continue
        }

        foreach ($part in $message.parts) {
            if ($null -eq $part.text) {
                continue
            }

            if ($part.text -match '<promise>ALL_DONE</promise>') {
                return 'all_done'
            }

            if ($part.text -match '<promise>DONE</promise>') {
                return 'done'
            }
        }
    }

    return 'none'
}

function Get-AssistantTextParts {
    param([string]$ExportPath)

    if (-not (Test-Path $ExportPath)) {
        return @()
    }

    $raw = Get-Content -Raw -Path $ExportPath
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
    }

    $jsonStart = $raw.IndexOf('{')
    $jsonEnd = $raw.LastIndexOf('}')
    if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
        return @()
    }

    $jsonPayload = $raw.Substring($jsonStart, $jsonEnd - $jsonStart + 1)

    try {
        $export = $jsonPayload | ConvertFrom-Json
    } catch {
        return @()
    }

    if (-not $export.messages) {
        return @()
    }

    $assistantTexts = New-Object System.Collections.Generic.List[string]

    foreach ($message in $export.messages) {
        if ($message.info.role -ne 'assistant') {
            continue
        }

        foreach ($part in $message.parts) {
            if ($null -eq $part.text -or [string]::IsNullOrWhiteSpace($part.text)) {
                continue
            }

            $assistantTexts.Add([string]$part.text)
        }
    }

    return $assistantTexts.ToArray()
}

function Invoke-OpenCode {
    param(
        [string[]]$Arguments,
        [string]$StdOutPath,
        [string]$StdErrPath
    )

    $allArguments = @($script:OpenCodeBaseArgs + $Arguments)

    if (Test-Path $StdOutPath) {
        Remove-Item -Path $StdOutPath -Force
    }

    if (Test-Path $StdErrPath) {
        Remove-Item -Path $StdErrPath -Force
    }

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $script:OpenCodeExecutable @allArguments 1> $StdOutPath 2> $StdErrPath
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $stdout = ''
    if (Test-Path $StdOutPath) {
        $stdout = Get-Content -Raw -Path $StdOutPath
    }

    $stderr = ''
    if (Test-Path $StdErrPath) {
        $stderr = Get-Content -Raw -Path $StdErrPath
    }

    return [PSCustomObject]@{
        ExitCode = $exitCode
        StdOut = $stdout
        StdErr = $stderr
    }
}

function Initialize-OpenCodeCommand {
    if ($UseInstalledOpenCode) {
        $script:OpenCodeExecutable = 'opencode'
        $script:OpenCodeBaseArgs = @()
        return
    }

    $script:OpenCodeExecutable = 'npx.cmd'
    $script:OpenCodeBaseArgs = @('-y', $PinnedOpenCodePackage)
}

function Get-OpenCodeVersion {
    param([string]$LogDir)

    $versionStdOut = Join-Path $LogDir 'ralph_opencode_version_stdout.log'
    $versionStdErr = Join-Path $LogDir 'ralph_opencode_version_stderr.log'
    $versionResult = Invoke-OpenCode -Arguments @('--version') -StdOutPath $versionStdOut -StdErrPath $versionStdErr

    if ($versionResult.ExitCode -ne 0) {
        $details = $versionResult.StdErr.Trim()
        if ([string]::IsNullOrWhiteSpace($details)) {
            $details = $versionResult.StdOut.Trim()
        }

        throw "Unable to determine OpenCode version. $details"
    }

    $rawVersion = $versionResult.StdOut.Trim()
    if ($rawVersion.StartsWith('v')) {
        $rawVersion = $rawVersion.Substring(1)
    }

    try {
        return [Version]$rawVersion
    } catch {
        throw "Unable to parse OpenCode version string: $rawVersion"
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectDir 'logs'

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

if ([string]::IsNullOrWhiteSpace($PromptFile)) {
    if ($Mode -eq 'build') {
        $PromptFile = Join-Path $ScriptDir 'ralph-opencode-build-prompt.md'
    } else {
        throw 'Plan mode prompt file was not provided.'
    }
}

if (-not (Test-Path $PromptFile)) {
    throw "Prompt file not found: $PromptFile"
}

function Test-ServerPort {
    param([int]$Port)

    try {
        $connection = Test-NetConnection -ComputerName '127.0.0.1' -Port $Port -WarningAction SilentlyContinue
        return [bool]$connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Get-AvailableServerPort {
    param([int]$PreferredPort)

    if (-not (Test-ServerPort -Port $PreferredPort)) {
        return $PreferredPort
    }

    for ($candidate = $PreferredPort + 1; $candidate -lt ($PreferredPort + 100); $candidate += 1) {
        if (-not (Test-ServerPort -Port $candidate)) {
            return $candidate
        }
    }

    throw "Could not find a free OpenCode server port near $PreferredPort"
}

function Ensure-OpenCodeServer {
    param([int]$Port)

    if ($NoServerStart) {
        return
    }

    if (Test-ServerPort -Port $Port) {
        return
    }

    $serveArguments = @($script:OpenCodeBaseArgs + @('serve', '--hostname', '127.0.0.1', '--port', "$Port"))
    $process = Start-Process -FilePath $script:OpenCodeExecutable -ArgumentList $serveArguments -WindowStyle Hidden -PassThru

    $maxServerPolls = 12
    for ($poll = 1; $poll -le $maxServerPolls; $poll += 1) {
        Start-Sleep -Seconds 1

        if (Test-ServerPort -Port $Port) {
            return
        }

        if ($process.HasExited) {
            break
        }
    }

    if (-not (Test-ServerPort -Port $Port)) {
        throw "OpenCode server did not start on port $Port. Spawned PID: $($process.Id)"
    }
}

function Get-SessionIdByTitle {
    param([string]$Title)

    $sessionListStdOut = Join-Path $LogDir 'ralph_opencode_session_list_stdout.log'
    $sessionListStdErr = Join-Path $LogDir 'ralph_opencode_session_list_stderr.log'
    $sessionListResult = Invoke-OpenCode -Arguments @('session', 'list') -StdOutPath $sessionListStdOut -StdErrPath $sessionListStdErr

    if ($sessionListResult.ExitCode -ne 0) {
        return $null
    }

    $sessionList = $sessionListResult.StdOut -split [Environment]::NewLine
    $line = $sessionList | Select-String -SimpleMatch $Title | Select-Object -Last 1
    if (-not $line) {
        return $null
    }

    $trimmed = $line.ToString().Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
        return $null
    }

    return ($trimmed -split '\s+')[0]
}

function Test-HeadlessOpenCodeHealth {
    param(
        [string]$AttachUrl,
        [string]$ProjectDir,
        [string]$Agent,
        [string]$Model,
        [string]$LogDir
    )

    $healthStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $healthTitle = "ralph-health-check-$healthStamp"
    $healthStdOut = Join-Path $LogDir "ralph_opencode_health_${healthStamp}_stdout.log"
    $healthStdErr = Join-Path $LogDir "ralph_opencode_health_${healthStamp}_stderr.log"
    $healthExport = Join-Path $LogDir "ralph_opencode_health_${healthStamp}.json"
    $healthPrompt = 'Reply with exactly: headless-ok'

    $healthRun = Invoke-OpenCode -Arguments @('run', '--attach', $AttachUrl, '--dir', $ProjectDir, '--title', $healthTitle, '--agent', $Agent, '--model', $Model, $healthPrompt) -StdOutPath $healthStdOut -StdErrPath $healthStdErr

    if ($healthRun.ExitCode -ne 0) {
        $details = $healthRun.StdErr.Trim()
        if ([string]::IsNullOrWhiteSpace($details)) {
            $details = $healthRun.StdOut.Trim()
        }

        throw "OpenCode headless health check failed. $details"
    }

    Start-Sleep -Seconds 2
    $sessionId = Get-SessionIdByTitle -Title $healthTitle
    if (-not $sessionId) {
        throw 'OpenCode headless health check failed. Could not resolve the health-check session id.'
    }

    $maxHealthPolls = 3
    for ($poll = 1; $poll -le $maxHealthPolls; $poll += 1) {
        $healthExportStdOut = Join-Path $LogDir "ralph_opencode_health_${healthStamp}_export_poll_${poll}_stdout.log"
        $healthExportStdErr = Join-Path $LogDir "ralph_opencode_health_${healthStamp}_export_poll_${poll}_stderr.log"
        $healthExportResult = Invoke-OpenCode -Arguments @('export', $sessionId) -StdOutPath $healthExportStdOut -StdErrPath $healthExportStdErr

        $healthExportContents = @()
        if (-not [string]::IsNullOrWhiteSpace($healthExportResult.StdOut)) {
            $healthExportContents += $healthExportResult.StdOut
        }
        if (-not [string]::IsNullOrWhiteSpace($healthExportResult.StdErr)) {
            $healthExportContents += $healthExportResult.StdErr
        }
        $healthExportContents | Out-File -FilePath $healthExport -Encoding utf8

        if ($healthExportResult.ExitCode -ne 0) {
            throw 'OpenCode headless health check failed. Could not export the health-check session.'
        }

        $assistantTexts = Get-AssistantTextParts -ExportPath $healthExport
        if ($assistantTexts.Count -gt 0) {
            if ($assistantTexts | Where-Object { $_ -match 'headless-ok' }) {
                return
            }

            throw 'OpenCode headless health check failed. Assistant output did not include the expected sentinel.'
        }

        if ($poll -lt $maxHealthPolls) {
            Start-Sleep -Seconds 2
        }
    }

    throw 'OpenCode headless health check failed. Assistant produced no text output.'
}

function New-MessageArgument {
    param([string]$Content)

    $singleLine = $Content -replace "`r?`n", ' '
    $singleLine = $singleLine -replace '\s{2,}', ' '
    return $singleLine.Trim()
}

Initialize-OpenCodeCommand

if ([string]::IsNullOrWhiteSpace($AttachUrl)) {
    $ServerPort = Get-AvailableServerPort -PreferredPort $ServerPort
    $AttachUrl = "http://127.0.0.1:$ServerPort"
}

Ensure-OpenCodeServer -Port $ServerPort

$openCodeVersion = Get-OpenCodeVersion -LogDir $LogDir
if ($openCodeVersion -lt $MinimumOpenCodeVersion) {
    throw "OpenCode 1.3.17 or newer is required for autonomous TODO execution. Found: $openCodeVersion"
}

Test-HeadlessOpenCodeHealth -AttachUrl $AttachUrl -ProjectDir $ProjectDir -Agent $Agent -Model $Model -LogDir $LogDir

$prompt = Get-Content -Raw -Path $PromptFile
$promptMessage = New-MessageArgument -Content $prompt
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$sessionLog = Join-Path $LogDir "ralph_opencode_${Mode}_session_${timestamp}.log"

"Ralph OpenCode Loop" | Tee-Object -FilePath $sessionLog -Append | Out-Null
"Mode: $Mode" | Tee-Object -FilePath $sessionLog -Append | Out-Null
"Attach: $AttachUrl" | Tee-Object -FilePath $sessionLog -Append | Out-Null
"Prompt: $PromptFile" | Tee-Object -FilePath $sessionLog -Append | Out-Null
"Model: $Model" | Tee-Object -FilePath $sessionLog -Append | Out-Null
"Agent: $Agent" | Tee-Object -FilePath $sessionLog -Append | Out-Null
Write-Status "Ralph OpenCode Loop"
Write-Status "Mode: $Mode"
Write-Status "Attach: $AttachUrl"
Write-Status "Model: $Model"
Write-Status "Agent: $Agent"

$iteration = 0

while ($true) {
    if ($MaxIterations -gt 0 -and $iteration -ge $MaxIterations) {
        "Reached max iterations: $MaxIterations" | Tee-Object -FilePath $sessionLog -Append | Out-Null
        break
    }

    $iteration += 1
    $iterStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $title = "ralph-$Mode-$iterStamp-$iteration"
    $iterLog = Join-Path $LogDir "ralph_opencode_${Mode}_iter_${iteration}_${iterStamp}.log"
    $exportFile = Join-Path $LogDir "ralph_opencode_${Mode}_iter_${iteration}_${iterStamp}.json"

    "" | Tee-Object -FilePath $sessionLog -Append | Out-Null
    "Starting iteration $iteration ($title)" | Tee-Object -FilePath $sessionLog -Append | Out-Null
    Write-Status "Starting iteration $iteration ($title)"

    $runStdOut = Join-Path $LogDir "ralph_opencode_run_${iteration}_${iterStamp}_stdout.log"
    $runStdErr = Join-Path $LogDir "ralph_opencode_run_${iteration}_${iterStamp}_stderr.log"
    $runResult = Invoke-OpenCode -Arguments @('run', '--attach', $AttachUrl, '--dir', $ProjectDir, '--title', $title, '--agent', $Agent, '--model', $Model, $promptMessage) -StdOutPath $runStdOut -StdErrPath $runStdErr

    $runOutput = @()
    if (-not [string]::IsNullOrWhiteSpace($runResult.StdOut)) {
        $runOutput += $runResult.StdOut
    }
    if (-not [string]::IsNullOrWhiteSpace($runResult.StdErr)) {
        $runOutput += $runResult.StdErr
    }

    $runOutput | Tee-Object -FilePath $iterLog | Tee-Object -FilePath $sessionLog -Append | Out-Null

    if ($runResult.ExitCode -ne 0) {
        $details = $runResult.StdErr.Trim()
        if ([string]::IsNullOrWhiteSpace($details)) {
            $details = $runResult.StdOut.Trim()
        }

        throw "OpenCode run failed during iteration $iteration. $details"
    }

    Start-Sleep -Seconds 5
    $sessionId = Get-SessionIdByTitle -Title $title

    if (-not $sessionId) {
        "Could not resolve session id for title: $title" | Tee-Object -FilePath $sessionLog -Append | Out-Null
        Write-Status "Could not resolve session id for title: $title"
        Start-Sleep -Seconds 2
        continue
    }

    $maxExportPolls = 3
    $completionDetected = $false

    for ($poll = 1; $poll -le $maxExportPolls; $poll += 1) {
        $exportStdOut = Join-Path $LogDir "ralph_opencode_export_${iteration}_${iterStamp}_poll_${poll}_stdout.log"
        $exportStdErr = Join-Path $LogDir "ralph_opencode_export_${iteration}_${iterStamp}_poll_${poll}_stderr.log"
        $exportProcess = Start-Process -FilePath 'opencode' -ArgumentList @('export', $sessionId) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $exportStdOut -RedirectStandardError $exportStdErr

        $exportContents = @()
        if (Test-Path $exportStdOut) {
            $exportContents += Get-Content -Path $exportStdOut
        }
        if (Test-Path $exportStdErr) {
            $exportContents += Get-Content -Path $exportStdErr
        }
        $exportContents | Out-File -FilePath $exportFile -Encoding utf8

        if ($exportProcess.ExitCode -ne 0) {
            "Export failed for session $sessionId with exit code $($exportProcess.ExitCode)" | Tee-Object -FilePath $sessionLog -Append | Out-Null
            Write-Status "Export failed for session $sessionId with exit code $($exportProcess.ExitCode)"
            Start-Sleep -Seconds 2
            continue
        }

        $completionState = Get-AssistantCompletionState -ExportPath $exportFile

        if ($completionState -eq 'all_done') {
            "Detected <promise>ALL_DONE</promise> in $exportFile" | Tee-Object -FilePath $sessionLog -Append | Out-Null
            Write-Status "Detected <promise>ALL_DONE</promise> in $exportFile"
            $completionDetected = $true
            break
        }

        if ($completionState -eq 'done') {
            "Detected <promise>DONE</promise> in $exportFile" | Tee-Object -FilePath $sessionLog -Append | Out-Null
            Write-Status "Detected <promise>DONE</promise> in $exportFile"
            $completionDetected = $true
            break
        }

        if ($poll -lt $maxExportPolls) {
            Write-Status "Waiting for completion signal from session $sessionId (poll $poll/$maxExportPolls)"
            Start-Sleep -Seconds 2
        }
    }

    if (-not $completionDetected) {
        "No completion signal found in $exportFile" | Tee-Object -FilePath $sessionLog -Append | Out-Null
        Write-Status "No completion signal found in $exportFile"
    }

    if ((Get-AssistantCompletionState -ExportPath $exportFile) -eq 'all_done') {
        break
    }

    Start-Sleep -Seconds 2
}
