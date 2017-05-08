#!/usr/bin/env bash

PASSWORD=${1}
GATEWAY=${2}
SUBNET=${3}
START_IP=${4}

lib/ld-2.19.so --library-path ./lib/ lib/sadp_tool ${PASSWORD} ${GATEWAY} ${SUBNET} ${START_IP}
