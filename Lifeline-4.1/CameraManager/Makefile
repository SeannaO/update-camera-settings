APP_ID = CameraManager
APP_VERSION = 1.4.3
APP_VENDOR = solink

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

CAMERAMANAGER_TARGET_FILES=$(TARGET_BUILD_PATH)/$(target)/CameraManager

CAMERAMANAGER_TARGET_WWW=CameraManager-www
CAMERAMANAGER_TARGET_CGI=$(CAMERAMANAGER_TARGET_WWW)/cgi-bin

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
APP_LDFLAGS += -lCPipc-2.2
APP_LDFLAGS += -lsoup-2.4
CFLAGS += -I$(ARCH_DIR)/usr/include/CP-2.2
CFLAGS += -I$(ARCH_DIR)/usr/include/libsoup-2.4

CFLAGS += $(APP_CFLAGS)
CFLAGS += -I.
LDFLAGS += $(APP_LDFLAGS)

PLAINOBJS = $(SRCS:.c=.o)
OBJS = $(addprefix $(TARGET_BUILD_PATH)/$(target)/,$(PLAINOBJS))

#Flags for compiling an apache module
#For compiling an apache module, uncomment this part
#APACHE_CFLAGS = -DLINUX=2 \
#		 -D_GNU_SOURCE \
#		 -D_LARGEFILE64_SOURCE \
#		 -D_REENTRANT \
#		 -I$(LLSDK_HOME)/$(arch)/usr/local/apache/include \
#		 -L$(LLSDK_HOME)/$(arch)/usr/local/apache/lib

##
## Definitions for compiling QT application
##
#QT_APP_LOC=qt
#QT_APP=CameraManager-qt
#QT_PRO=CameraManager-qt.pro
#QT_PATH=$(ARCH_DIR)/usr/qt/
#QT_MKSPECS=$(QT_PATH)/mkspecs
#QT_MAKE=$(QT_PATH)/bin/qt-make

all: sdkapibld install

##
## Include LifeLine Makefile
##
include $(LLSDK_HOME)/Makefile.in

###### Compile program
$(TARGET_BUILD_PATH)/$(target)/%.o: src/%.c $(TARGET_BUILD_PATH)/$(target)
	$(CC) -Wall -Werror $(CFLAGS) $(INCLUDES) -c -o $@ $<

$(TARGET_BUILD_PATH)/$(target)/CameraManager: $(OBJS) $(TARGET_BUILD_PATH)/$(target)
	$(CC) -o $@ $(CFLAGS) $(OBJS) $(LDFLAGS)  

$(TARGET_BUILD_PATH)/$(target):
	mkdir -p $(TARGET_BUILD_PATH)/$(target)
	
sdkapibld: app-create-dirs
	if test -f sdkapi.xml ;\
	then $(SDKAPI) -a sdkapi.xml -p $(SDKAPI_TEMPLATE) -o $(PKG_DIR)/$(APP_API_TABLE); \
	else echo "sdkapi.xml file does not exist. Skipping creation of skdRpcTable.xml";\
	fi
	if test -f $(APP_CALLBACK_TABLE);\
	then cp -fp $(APP_CALLBACK_TABLE) $(PKG_DIR);\
	fi

###### Kernel Module Development
# Type 'o2 enable-ko-support' to enable Kernel Module support, then
# uncomment the following line:
#$(eval $(call CREATE_KERNEL_MODULE_TARGET, CameraManager))

###### Compile apache module
#For compiling an apache module, uncomment this part
# apache: app-create-dirs
#	mkdir -p modules/$(target)
#	$(CC) <module .c source file> -fPIC -shared -o modules/$(target)/<output .so library> $(APACHE_CFLAGS) $(CFLAGS)
#	cp -rfp modules/$(target)/<output .so library> $(PKG_DIR)

###### Compile QT application 
#For compiling an apache module, uncomment this part
#$(QT_APP_LOC)/$(QT_APP):
#	rm -rf $(QT_MKSPECS)/default
#	ln -s $(QT_MKSPECS)/qws/linux-x86_64-g++ $(QT_MKSPECS)/default
#	(cd $(QT_APP_LOC) && \
#		$(QT_MAKE) $(ARCH_DIR) $(QT_PRO) $(toolchain) $(ARCH_STR) && \
#		make)
#	cp -rf $(QT_APP_LOC)/$(QT_APP) $(PKG_DIR)
#	chmod -R 0775 $(PKG_DIR)/$(QT_APP)

###### Create Package
# PKG_XXX values are defined by $LLSDK_HOME/Makefile.in
#
# Place here any copies to the package
# 
package: $(TARGET_BUILD_PATH)/$(target)/CameraManager
	cp -rfp $(CAMERAMANAGER_TARGET_FILES) $(PKG_DIR)
	cp -rfp $(TARGET_BINARY_FILES) $(PKG_DIR)
	cp -rfp $(NODEAPP_TARGET_FILES) $(PKG_DIR)
	cp -rfp bin/$(LINUX_ARCH)/forever $(PKG_DIR)/node_modules
	cp -rfp $(CAMERAMANAGER_TARGET_WWW) $(PKG_DIR)
	chmod -R 0775 $(PKG_DIR)/$(CAMERAMANAGER_TARGET_CGI)

##
## Clean
##
clean: $(CPCLEAN)
	rm -rf *.o CameraManager $(PKG_DIR_ROOT) $(TARGET_BUILD_PATH)/$(target)

.PHONY: all clean install package app-create-dirs app-files app-create apache sdkapibld 
