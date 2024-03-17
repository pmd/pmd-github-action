#!/usr/bin/env bash

echo "Running PMD 6.39.0 with: $@"

echo '{
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "PMD",
          "version": "6.39.0"
        }
      }
    }
  ]
}' > pmd-report.sarif

