#!/bin/bash

statusResult=$(git status --porcelain | wc -l)
if [[ statusResult -eq "0" ]]
then
   echo 'no changes found'
else
   echo 'The workspace is modified:'
   echo "$statusResult"
fi

