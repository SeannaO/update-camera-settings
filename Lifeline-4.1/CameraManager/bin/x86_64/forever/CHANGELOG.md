## CHANGELOG

### Version 0.7.0

- Added experimental foreverd implementation for working with init.d, systemv, etc
- Expose `Monitor.killTree` for killing process trees for processes spawned by forever (default: true)
- Added commands for working with forever log files
- Added forever.tail()
- Update daemon to 0.3.2
- Expose Monitor.spawnWith in Monitor.data

### Version 0.6.9

- Add `--plain` option disabling CLI colors

### Version 0.6.8

- Add --watch/-w command line option
- Add implementation to restart processes when a file changes

### Version 0.6.7

- Replace sys module usages with util
- Update winston dependency to 0.4.x

### Version 0.6.6

- Add options.hideEnv to hide default env values

### Version 0.6.5

- Update `forever.Monitor.prototype.restart()` to allow force restarting of processes in less than `.minUptime`

### Version 0.6.4

- Update forever.startServer() to support more liberal arguments.

### Version 0.6.3

- Create `sockPath` if it does not exist already. 
- When stopping only respond with those processes which have been stopped.

### Version 0.6.2

- Display warning / error messages to the user when contacting UNIX sockets.

### Version 0.6.1

- Fixed a bug where numbers in the file path caused forever to think
- Process variables are not always available, for example if you execute

### Version 0.6.0

- Dont allow `-` in uuids generated by forever. 
- When executing stopall, dont kill the current process. 
- Added forever.debug for debugging purposes
- Keep processes silent on `forever restart` if requested. A couple of minor log formatting updates
- Update `forever list` to use cliff
- Added generic hooks for forever.Monitor
- Use default values for log file and pid file (prevents a process from being nuked by being daemonized)
- Default `minUptime` to 0
- Create `options.uid` by default in `.startDaemon()` if it is already not provided
- Include uids in `forever list`
- Catch `uncaughtException` slightly more intelligently
- Forever no longer uses *.fvr files in-favor of a TCP server in each forever process started by the CLI. Programmatic usage will require an additional call to `forever.createServer()` explicitally in order for your application to be available in `forever list` or `forever.list()`
- Add `portfinder` dependency to package.json
- Expose `forever.columns` and update `forever.format` to generate results dynamically

### Version 0.5.6

- Update winston dependency to 0.3.x

### Version 0.5.5

- Remove .fvr file when a forever.Monitor child exits

### Version 0.5.4

- Add --spinSleepTime to throttle instead of killing spinning scripts

### Version 0.5.3

- Added `preferGlobal` option to package.json
- Improve forever when working with `-c` or `--command`

### Version 0.5.2

- Print help when a valid action isn't given
- Batch the cleaning of *.fvr and *.pid files to avoid file descriptor overload
- Check if processes exist before returning in `.findByScript()`.

### Version 0.5.1

- Readd eyes dependency

### Version 0.5.0

- Added forever.logFilePath utility.
- Added forever.pidFilePath implementation
- Added append log implementation to CLI
- Fix for spawning multiple processes from a single forever process
- Added forever.config using nconf
- Better bookkeeping of *.fvr and *.pid files

### Version 0.4.1

- Remove unnecessary eyes dependency

### Version 0.4.1

- Update sourceDir option to check for file paths relative to root

### Version 0.4.0 
                                                     
- Enable forever to track uptime                     
- Add `restart` command to forever.Monitor and CLI   
- Ensure forever.load() is called on require()       
- Better handling for for `-p` CLI option            
- Enable options to be passed to child_process.spawn  

### Version 0.3.1

- Allow forever to start any script (not just node) from nodejs code  
- Array shortcut to set command and options                           
- Check for scripts with fs.stat before running them                  
- Improved how *.fvr and *.pid files are managed by Forever CLI       
- Ability to delete all historical logs from CLI via 'cleanlogs'      
- Ability to stop script by name -- stops ALL scripts with that name. 
- Display logfile in 'forever list'.                                  
- Use process.kill() instead of exec('kill').                         
- Emit 'save' event when persisting to disk.                          
- Emit 'start' event when starting a forever child                    
- Remove 'auto-save' feature from Forever.start()                     

#### Breaking Changes
                                                                                         
- Push options hierarchy up one level. e.g. Forever.options.silent is now Forever.silent 
- Only 'error' event now emits with an error. All other events simply emit data           