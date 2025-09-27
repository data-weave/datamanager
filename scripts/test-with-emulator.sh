#!/bin/bash
set -e

echo "Starting Firebase emulator..."
npx firebase emulators:start --only firestore > emulator.log 2>&1 &
EMULATOR_PID=$!

cleanup() {
  echo "Stopping emulator..."
  kill $EMULATOR_PID 2>/dev/null || true
  # Clean up any remaining processes
  pkill -f "firebase.*emulator" 2>/dev/null || true
  rm -f emulator.log
}
trap cleanup EXIT

# TODO: make this better by checking if the emulator is running
echo "Waiting for emulator..."
sleep 25

echo "Running tests..."
export FIRESTORE_EMULATOR_HOST=localhost:8080
echo "Testing JS SDK..."
npm run test:js-sdk
echo "Testing Admin SDK..."
npm run test:admin-sdk