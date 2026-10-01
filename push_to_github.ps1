# Automated GitHub Repository Creator & Pusher using GitHub CLI
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  AUTOMATED GITHUB REPOSITORY CREATOR & PUSHER" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "`nStep 1: Logging in via GitHub CLI (Browser window will open)..." -ForegroundColor Yellow
& "C:\Program Files\GitHub CLI\gh.exe" auth login --web -h github.com

Write-Host "`nStep 2: Creating GitHub Repository 'ML-Project-AI-Resume-Screening' and Pushing All Code..." -ForegroundColor Yellow
& "C:\Program Files\GitHub CLI\gh.exe" repo create ML-Project-AI-Resume-Screening --public --source=. --remote=origin --push

Write-Host "`n===================================================" -ForegroundColor Green
Write-Host "SUCCESS! Your project is pushed to GitHub!" -ForegroundColor Green
Write-Host "Repository: https://github.com/geethikameda7125/ML-Project-AI-Resume-Screening" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
