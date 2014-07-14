##
## Include LifeLine Makefile
##
include $(LLSDK_HOME)/Makefile.in

##
## For Debian Package System
##
APP_ID = CameraManager
APP_VERSION = 1.0
APP_VENDOR = solink

APP_BACKUP_SCRIPT = backup.sh
APP_ROLLBACK_SCRIPT = rollback.sh
APP_REMOVE_SCRIPT = remove.sh
APP_API_TABLE = sdkRpcTable.xml
APP_CALLBACK_TABLE = sdkCallback.xml

##
## Sources
##
SRCS = app_keep_alive.c parsing.c api_callbacks.c main.c 

NODE_APP_PATH = ../../app
TARGET_BUILD_PATH = targets

SDKAPI=$(LLSDK_HOME)/bin/scripts/apidoc.py
SDKAPI_TEMPLATE=$(LLSDK_HOME)/bin/scripts/sdkRpcTable.xml.template

##
## Files or directories to copy to 
## application bundle
##
TARGET_BINARY_FILES= bin/$(LINUX_ARCH)/ffmpeg bin/$(LINUX_ARCH)/node bin/$(LINUX_ARCH)/cpulimit bin/$(LINUX_ARCH)/rtsp_grabber bin/$(LINUX_ARCH)/thumbnailer bin/$(LINUX_ARCH)/mem.sh bin/$(LINUX_ARCH)/mem_pid.sh
NODEAPP_TARGET_FILES= $(NODE_APP_PATH)/assets $(NODE_APP_PATH)/controllers $(NODE_APP_PATH)/helpers $(NODE_APP_PATH)/db_layers  $(NODE_APP_PATH)/api $(NODE_APP_PATH)/models $(NODE_APP_PATH)/views $(NODE_APP_PATH)/node_modules $(NODE_APP_PATH)/app.js $(NODE_APP_PATH)/logs
CAMERAMANAGER_TARGET_FILES=$(TARGET_BUILD_PATH)/$(target)/CameraManager $(APP_BACKUP_SCRIPT) $(APP_ROLLBACK_SCRIPT) $(APP_REMOVE_SCRIPT)

CAMERAMANAGER_TARGET_WWW=CameraManager-www
CAMERAMANAGER_TARGET_CGI=$(CAMERAMANAGER_TARGET_WWW)/cgi-bin
CAMERAMANAGER_TARGET_CONTROL=control

##
## Default flags
##
ifeq ($(build),release)
CFLAGS += -O2
else
CFLAGS += -O2 -g -DDEBUG
endif

##
## Flags
##

# The following lines enable CP IPC support
APP_LDFLAGS += -lCPipc-2
APP_LDFLAGS += -lsoup-2.4
CFLAGS += -I$(ARCH_DIR)/usr/include/CP-2
CFLAGS += -I$(ARCH_DIR)/usr/include/libsoup-2.4

CFLAGS += $(APP_CFLAGS)
CFLAGS += -I.
LDFLAGS += $(APP_LDFLAGS)

PLAINOBJS = $(SRCS:.c=.o)
OBJS = $(addprefix $(TARGET_BUILD_PATH)/$(target)/,$(PLAINOBJS))

all: sdkapibld install

###### Compile program
$(TARGET_BUILD_PATH)/$(target)/%.o: src/%.c $(TARGET_BUILD_PATH)/$(target)
	$(CC) -Wall -Werror $(CFLAGS) $(INCLUDES) -c -o $@ $<

$(TARGET_BUILD_PATH)/$(target)/CameraManager: $(OBJS) $(TARGET_BUILD_PATH)/$(target)
	o2 check_app $(APP_BACKUP_SCRIPT) $(APP_ROLLBACK_SCRIPT) $(APP_REMOVE_SCRIPT) control/*
	$(CC) -o $@ $(CFLAGS) $(OBJS) $(LDFLAGS)  

$(TARGET_BUILD_PATH)/$(target):
	mkdir -p $(TARGET_BUILD_PATH)/$(target)

sdkapibld:
	if test -f sdkapi.xml ;\
	then $(SDKAPI) -a sdkapi.xml -p $(SDKAPI_TEMPLATE) -o $(PKG_DIR)/$(APP_API_TABLE); \
	else echo "sdkapi.xml file does not exist. Skipping creation of skdRpcTable.xml";\
	fi
	if test -f $(APP_CALLBACK_TABLE);\
	then cp $(APP_CALLBACK_TABLE) $(PKG_DIR);\
	fi

###### Kernel Module Development
# Type 'o2 enable-ko-support' to enable Kernel Module support, then
# uncomment the following line:
#$(eval $(call CREATE_KERNEL_MODULE_TARGET, CameraManager))

###### Create Package
# PKG_XXX values are defined by $LLSDK_HOME/Makefile.in
#
# Place here any copies to the package
# 
$(eval $(call CREATE_PACKAGE_TARGETS, CameraManager, package))
package: deb_control $(TARGET_BUILD_PATH)/$(target)/CameraManager
	cp -rf $(CAMERAMANAGER_TARGET_FILES) $(PKG_DIR)
	cp -rf $(TARGET_BINARY_FILES) $(PKG_DIR)
	cp -rf $(NODEAPP_TARGET_FILES) $(PKG_DIR)
	cp -rf bin/$(LINUX_ARCH)/forever $(PKG_DIR)/node_modules
	cp -rf $(CAMERAMANAGER_TARGET_WWW) $(PKG_DIR)
	chmod -R 0775 $(PKG_DIR)/$(CAMERAMANAGER_TARGET_CGI)
	if [ -d $(CAMERAMANAGER_TARGET_CONTROL) ]; then cp -rf $(CAMERAMANAGER_TARGET_CONTROL)/ $(PKG_DIR_ROOT); fi

##
## Main
##
install: $(CPTARGETS)
	if [ "" != "$(PKG_COPY_TO)" ]; then cp -f $(PKG_DIR_ROOT).o2 $(PKG_COPY_TO); fi

##
## Clean
##
clean: $(CPCLEAN)
	rm -rf *.o CameraManager $(PKG_DIR_ROOT)* $(TARGET_BUILD_PATH)/$(target)
	rm -rf 

.PHONY: all clean install package
