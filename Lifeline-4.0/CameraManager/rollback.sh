#!/bin/bash
backupdir=.backup

cd /opt/apps/solink/CameraManager

if [ -d $backupdir ]
then
	for d in `find $backupdir -type d`
	do
		d2=`echo "$d" | sed -e "s#$backupdir/##"`
		if [ "$d2" != "$backupdir" ]
		then
			mkdir -p $d2
		fi
	done

	for f in `find $backupdir -type f`
	do
		f2=`echo "$f" | sed -e "s#$backupdir/##"`
		if [ "$f2" != "rollback.sh" ]
		then
			cp -f $f $f2
		fi
	done
fi
