(crontab -l ; echo "*/1 * * * * kill -18 `pgrep svcd`") |uniq - | crontab -
renice 10 `pgrep svcd`
while true; do
 kill -19 `pgrep svcd`
 sleep 0.8
 kill -18 `pgrep svcd` 
 sleep 0.1
done
