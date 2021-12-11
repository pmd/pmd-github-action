@echo off
echo Running PMD 6.39.0 with: %*

(
    echo {
    echo   "runs": [
    echo     {
    echo       "tool": {
    echo         "driver": {
    echo           "name": "PMD",
    echo           "version": "6.39.0"
    echo         }
    echo       }
    echo     }
    echo   ]
    echo }
)>"pmd-report.sarif"
