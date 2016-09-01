#!/usr/bin/env bash

INTERFACE=${1:-eth0}

CUR_INTERFACE=`getcfg "Network" "Default GW Device"`
INTERFACE_EXIST=`getcfg "$INTERFACE" "Mac Addresss"` # yes it's miss spelt in the config

if [ "$INTERFACE" == "$CUR_INTERFACE" ]
then
echo "$INTERFACE equals $CUR_INTERFACE exiting"
exit 0;
fi

if [ -z "$INTERFACE_EXIST" ]
then
echo "$INTERFACE does not exist exiting"
exit 1;
fi

setcfg "Network" "Auto GW Mode" "fixed"
setcfg "Network" "fixed_default_gw_1" "$INTERFACE"
setcfg "Network" "Default GW Device" "$INTERFACE"

/etc/init.d/network.sh restart
