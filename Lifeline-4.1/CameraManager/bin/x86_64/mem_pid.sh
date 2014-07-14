#!/usr/bin/env bash 

## Print header
while [ 1 ]; do
	## If the process is running, print the memory usage
	if [ -e /proc/$1/statm ]; then
		## Get the memory info
		m=`awk '' /proc/$1/statm`
		## Get the memory percentage
		perc=`top -bd .10 -p $1 -n 1  | grep node | awk '{print \$10}'`
		## print the results
		perc=`printf "%0.0f\n" $perc`
		echo -e "$perc";
		# If the process is not running
		if [ "$perc" -gt "$2" ]; then
			echo killing $1 process >&2
			sleep 5
			kill -9 $1
			exit
		fi
		# echo "$1 is not running";
	fi
	sleep 5
done
