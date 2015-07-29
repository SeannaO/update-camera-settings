#!/bin/sh
CONF=/etc/config/qpkg.conf
QPKG_NAME="SolinkConnect"
QPKG_ROOT=`/sbin/getcfg $QPKG_NAME Install_Path -f ${CONF}`

export PATH=$PATH:$QPKG_ROOT/app:/opt/bin:/opt/sbin
export LD_LIBRARY_PATH=$LD_LBRARY_PATH:$QPKG_ROOT/app/bin/lib

case "$1" in
  start)
    ENABLED=$(/sbin/getcfg $QPKG_NAME Enable -u -d FALSE -f $CONF)
    if [ "$ENABLED" != "TRUE" ]; then
        echo "$QPKG_NAME is disabled."
        exit 1
    fi
    : ADD START ACTIONS HERE
    cd $QPKG_ROOT/app
    ./node_modules/forever/bin/forever --sourceDir=$QPKG_ROOT/app -a -l /dev/null -o /dev/null -e /dev/null -p $QPKG_ROOT start ./app.js "/share/SolinkConnect" > /dev/null
    ;;

  stop)
    : ADD STOP ACTIONS HERE
    cd $QPKG_ROOT/app
    ./node_modules/forever/bin/forever stop $QPKG_ROOT/app/app.js 
    ;;

  restart)
    $0 stop
    $0 start
    ;;

  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
esac

exit 0
