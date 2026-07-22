[CmdletBinding()]
param(
    [switch]$NoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
$PatchDirectory = Join-Path $ProjectRoot ".patches"

function Write-Step {
    param([Parameter(Mandatory)][string]$Message)

    Write-Host ""
    Write-Host "→ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([Parameter(Mandatory)][string]$Message)

    Write-Host "✓ $Message" -ForegroundColor Green
}

function Stop-Script {
    param([Parameter(Mandatory)][string]$Message)

    Write-Host ""
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

function Invoke-GitCommand {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$ErrorMessage
    )

    & git @Arguments

    if ($LASTEXITCODE -ne 0) {
        Stop-Script $ErrorMessage
    }
}

Write-Host "========================================" -ForegroundColor DarkRed
Write-Host " Story Builder — Installation du patch " -ForegroundColor DarkRed
Write-Host "========================================" -ForegroundColor DarkRed
Write-Host ""
Write-Host "Projet : $ProjectRoot"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-Script "Git est introuvable dans ce terminal."
}

if (-not (Test-Path -LiteralPath $PatchDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $PatchDirectory | Out-Null
    Stop-Script "Le dossier .patches a été créé. Ajoute un fichier .patch dedans, puis relance le script."
}

Push-Location $ProjectRoot

try {
    & git rev-parse --is-inside-work-tree *> $null

    if ($LASTEXITCODE -ne 0) {
        Stop-Script "Le dossier du projet n'est pas un dépôt Git."
    }

    $Patch = Get-ChildItem `
        -LiteralPath $PatchDirectory `
        -Filter "*.patch" `
        -File |
        Sort-Object LastWriteTime, Name |
        Select-Object -Last 1

    if (-not $Patch) {
        Stop-Script "Aucun fichier .patch n'a été trouvé dans le dossier .patches."
    }

    $Version = $Patch.BaseName

    if ($Version -match '^SB-(.+)$') {
        $Version = $Matches[1]
    }

    Write-Host "Patch détecté : $($Patch.Name)"
    Write-Host "Version cible  : $Version"

    Write-Step "Vérification du patch"

    Invoke-GitCommand `
        -Arguments @("apply", "--check", "--", $Patch.FullName) `
        -ErrorMessage "Le patch ne peut pas être appliqué. Il est peut-être déjà installé ou incompatible avec l'état actuel du projet."

    Write-Success "Vérification réussie"

    Write-Step "Application du patch"

    Invoke-GitCommand `
        -Arguments @("apply", "--", $Patch.FullName) `
        -ErrorMessage "Git n'a pas réussi à appliquer le patch."

    Write-Success "Patch appliqué"

    Write-Step "Préparation du commit"

    Invoke-GitCommand `
        -Arguments @("add", "--all") `
        -ErrorMessage "Git n'a pas réussi à préparer les modifications."

    & git diff --cached --quiet

    if ($LASTEXITCODE -eq 0) {
        Stop-Script "Aucune modification n'est prête à être enregistrée."
    }

    $CommitMessage = "Install Story Builder $Version"

    Invoke-GitCommand `
        -Arguments @("commit", "-m", $CommitMessage) `
        -ErrorMessage "Git n'a pas réussi à créer le commit."

    Write-Success "Commit créé : $CommitMessage"

    if (-not $NoPush) {
        Write-Step "Envoi vers GitHub"

        Invoke-GitCommand `
            -Arguments @("push") `
            -ErrorMessage "Le commit existe localement, mais le push vers GitHub a échoué."

        Write-Success "Push GitHub terminé"
    }
    else {
        Write-Host "• Push ignoré grâce à l'option -NoPush" -ForegroundColor Yellow
    }

    Write-Step "Nettoyage du dossier .patches"

    if (Test-Path -LiteralPath $PatchDirectory -PathType Container) {
        Get-ChildItem `
            -LiteralPath $PatchDirectory `
            -Force |
            ForEach-Object {
                Remove-Item `
                    -LiteralPath $_.FullName `
                    -Recurse `
                    -Force
            }
    }

    Write-Success "Contenu du dossier .patches supprimé"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkRed
    Write-Host " Mise à jour terminée " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor DarkRed
    Write-Host "Patch   : $($Patch.Name)"
    Write-Host "Version : $Version"
}
finally {
    Pop-Location
}
