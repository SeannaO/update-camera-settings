#!/bin/bash
backupdir=.backup

cd /opt/apps/solink/CameraManager

rm -rf $backupdir
mkdir -p $backupdir
for f in `find . -type f ! -wholename './.*'`
do
	cp -a -t $backupdir $f
done
