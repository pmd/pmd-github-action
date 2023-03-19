@echo off
echo Running PMD 7.0.0-SNAPSHOT with: %*

(
    echo {
    echo   "runs": [
    echo     {
    echo       "tool": {
    echo         "driver": {
    echo           "name": "PMD",
    echo           "version": "7.0.0-SNAPSHOT"
    echo         }
    echo       }
    echo     }
    echo   ]
    echo }
)>"pmd-report.sarif"
