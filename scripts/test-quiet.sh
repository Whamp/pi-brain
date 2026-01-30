#!/bin/sh
# Run vitest with quiet output on success, verbose on failure

output=$(npx vitest run --silent 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ]; then
  # Success: show just the summary
  echo "$output" | grep -E "(Test Files|Tests)"
else
  # Failure: show full output
  echo "$output"
fi

exit $exit_code
