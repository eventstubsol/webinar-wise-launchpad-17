@echo off
echo === Reverting Today's Changes ===
echo.

REM Get today's date
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TODAY=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%

echo Finding commits from today (%TODAY%)...
echo.

REM List today's commits
git log --oneline --since="%TODAY% 00:00" --until="%TODAY% 23:59"

echo.
echo This will create a new commit that reverts all changes from today.
echo Your commit history will be preserved.
echo.

set /p CONFIRM="Do you want to continue? (y/n): "

if /i "%CONFIRM%"=="y" (
    REM Get the last commit hash from before today
    for /f "tokens=*" %%i in ('git log --before="%TODAY% 00:00" -1 --format^=^"%%H^"') do set BEFORE_TODAY=%%i
    
    if "%BEFORE_TODAY%"=="" (
        echo Error: Could not find commits before today
        exit /b 1
    )
    
    echo.
    echo Reverting to commit: %BEFORE_TODAY%
    echo.
    
    REM Create a revert commit
    git revert --no-commit HEAD...%BEFORE_TODAY%
    
    REM Commit the revert
    git commit -m "Revert all changes from %TODAY%" -m "This reverts all commits made on %TODAY% to restore the previous working state."
    
    echo.
    echo Revert commit created locally.
    echo To push this revert to GitHub, run:
    echo   git push origin main
) else (
    echo Revert cancelled.
)

pause
