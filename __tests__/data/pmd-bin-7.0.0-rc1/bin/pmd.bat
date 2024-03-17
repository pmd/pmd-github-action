@echo off
echo Running PMD 7.0.0-rc1 with: %*

(
    echo {
    echo   "runs": [
    echo     {
    echo       "tool": {
    echo         "driver": {
    echo           "name": "PMD",
    echo           "version": "7.0.0-rc1"
    echo         }
    echo       }
    echo     }
    echo   ]
    echo }
)>"pmd-report.sarif"
