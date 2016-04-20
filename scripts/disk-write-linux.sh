#!/bin/bash

# Unmount all sub-partitions
ls $1?* | xargs -n1 umount -l || exit 1

# Write image data to device (1)
DDERR="$(dd status=noxfer bs=1M if=$2 of=$1 2>&1 > /dev/null)"
if [[ $DDERR == *"error"* || $DDERR == *"denied"* ]]
then
  >&2 echo $DDERR
  exit 1
fi
blockdev --rereadpt $1 || exit 1

# If there is a second device specified, unmount and write to that too
if [[ $3 && $4 ]]
then
  ls $3?* | xargs -n1 umount -l || exit 1
  DDERR="$(dd status=noxfer bs=1M if=$4 of=$3 2>&1 > /dev/null)"
  if [[ $DDERR == *"error"* || $DDERR == *"denied"* ]]
  then
    >&2 echo $DDERR
    exit 1
  fi
  blockdev --rereadpt $3 || exit 1
fi

exit 0
