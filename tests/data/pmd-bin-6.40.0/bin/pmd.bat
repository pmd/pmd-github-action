@echo off
echo Running PMD 6.40.0 with: pmd %*

(
    echo {
    echo   "runs": [
    echo     {
    echo       "tool": {
    echo         "driver": {
    echo           "name": "PMD",
    echo           "version": "6.40.0"
    echo         }
    echo       }
    echo     }
    echo   ]
    echo }
)>"pmd-report.sarif"
