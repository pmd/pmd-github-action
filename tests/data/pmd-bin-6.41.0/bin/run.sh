#!/usr/bin/env bash

echo "Running PMD 6.41.0 with: $@"

echo '{
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "PMD",
          "version": "6.41.0"
        }
      }
    }
  ]
}' > pmd-report.sarif

