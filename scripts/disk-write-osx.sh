#!/bin/bash

# Unmount all sub-partitions
diskutil unmountDisk $1 || exit 1

# Write image data to device (1)
DDERR="$(dd bs=1m if=$2 of=$1 2>&1 > /dev/null)"
if [[ $DDERR == *"error"* || $DDERR == *"denied"* ]]
then
  >&2 echo $DDERR
  exit 1
fi
diskutil unmountDisk $1 || exit 1

# If there is a second device specified, unmount and write to that too
if [[ $3 && $4 ]]
then
  diskutil unmountDisk $3 || exit 1
  DDERR="$(dd bs=1m if=$4 of=$3 2>&1 > /dev/null)"
  if [[ $DDERR == *"error"* || $DDERR == *"denied"* ]]
  then
    >&2 echo $DDERR
    exit 1
  fi
  diskutil unmountDisk $3
fi

exit 0
