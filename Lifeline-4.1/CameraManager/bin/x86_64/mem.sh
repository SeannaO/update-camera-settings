#!/usr/bin/env bash 

## Print header
# echo -e "Size\tResid.\tShared\tData\t%"
while [ 1 ]; do
	## Get the PID of the process name given as argument 1
	pidno=`pgrep $1`
	## If the process is running, print the memory usage
	if [ -e /proc/$pidno/statm ]; then
		## Get the memory info
		m=`awk '' /proc/$pidno/statm`
		## Get the memory percentage
		perc=`top -bd .10 -p $pidno -n 1  | grep $pidno | awk '{print \$10}'`
		## print the results
		perc=`printf "%0.0f\n" $perc`
		# echo -e "$perc";
		# If the process is not running
		if [ "$perc" -gt "$2" ]; then
			echo killing $1 process >&2
			killall $1
		fi
		# echo "$1 is not running";
	fi
done
