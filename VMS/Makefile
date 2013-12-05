###########################################################################
# Copyright (c) 2013 LenovoEMC Limited Permission is hereby granted, free 
# of charge, to any person obtaining a copy of the LenovoEMC-created 
# portions of the software included within the "LifeLine(tm) SDK" software 
# (the "Software"), to deal in the Software without restriction, including 
# without limitation the rights to use, copy, modify, merge, publish, 
# distribute, sublicense, and/or sell copies of the Software, and to 
# permit persons to whom the Software is furnished to do so, subject to 
# the following conditions: The Software is licensed solely for assisting 
# with use of, or developing applications that facilitate legal activities 
# working with, network storage devices from LenovoEMC Limited; if you 
# wish to distribute or use the Software solely with products of companies 
# other than LenovoEMC Limited and not to promote any functionality 
# associated with products of LenovoEMC, you are not licensed to copy or 
# to exercise any rights in connection with the Software. If You institute 
# patent litigation against any entity (including a cross-claim or 
# counterclaim in a lawsuit) alleging that the Software constitutes direct 
# or contributory copyright or patent infringement, then any patent and 
# copyright licenses granted to You under this license shall terminate as 
# of the date such litigation is filed. "You" (or "Your") shall mean an 
# individual or entity exercising permissions granted by this license. The 
# above copyright notice and this permission notice shall be included in 
# all copies or substantial portions of the Software. THE SOFTWARE IS 
# PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS 
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
# DEALINGS IN THE SOFTWARE.
###########################################################################

##
## Include LifeLine Makefile
##
include $(LLSDK_HOME)/Makefile.in

##
## Application Set info
##
SET_ID = VMS
SET_VENDOR = solink
SET_VERSION = 1.0

ifeq ($(target),i686-vmware)
  UPGRADE_PLATFORMS=vmware
endif
ifeq ($(target),x86_64-ix)
  UPGRADE_PLATFORMS=ix12
endif
ifeq ($(target),x86_64-px)
  UPGRADE_PLATFORMS=px4px6
endif
ifeq ($(target),b2a)
  UPGRADE_PLATFORMS=b2a
endif
ifeq ($(target),px4-300r)
  UPGRADE_PLATFORMS=px4-300r
endif
ifeq ($(target),r12b)
  UPGRADE_PLATFORMS=r12b
endif
ifeq ($(target),px12-450r)
  UPGRADE_PLATFORMS=r12b
endif
ifeq ($(target),arm-hmnhd)
  UPGRADE_PLATFORMS=hmnhd
endif
ifeq ($(target),arm-ix)
  UPGRADE_PLATFORMS=ix2-200,ix4-200d
endif
ifeq ($(target),arm-ix2-ng)
  UPGRADE_PLATFORMS=ix2-ng
endif
ifeq ($(target),arm-hm3)
  UPGRADE_PLATFORMS=hm3
endif
ifeq ($(target),h4c)
  UPGRADE_PLATFORMS=h4c
endif

##
## Applications
##
APPS_ROOT_DIR = ..
SET_APPS =  CameraManager

PKG_LIST_FILE = pkg.lst
PKG_LIST_FILE_FULL = fullpkg.lst
SET_PKG_NAME := $(shell echo $(SET_VENDOR)_$(SET_ID)_$(SET_VERSION)_$(DPKG_ARCH) | tr '[A-Z]' '[a-z]')

all: package

upgrade: descriptor_end upgrade_descriptor
	touch $(PKG_LIST_FILE_FULL)
	mkdir -p $(target)
	tar -zcf $(target)/$(SET_PKG_NAME).tgz --remove-files applicationSet.xml upgrade.xml `cat $(PKG_LIST_FILE_FULL)`

package: descriptor_end
	touch $(PKG_LIST_FILE_FULL)
	mkdir -p $(target)
	tar -zcf $(target)/$(SET_PKG_NAME).tgz --remove-files applicationSet.xml `cat $(PKG_LIST_FILE_FULL)`

clean_pkg_lists:
	rm -f $(PKG_LIST_FILE) $(PKG_LIST_FILE_FULL)

upgrade_descriptor:
	sed -e "s#@@DPKG_ARCH@@#$(DPKG_ARCH)#g" -e "s#@@TARGET@@#$(target)#g" -e "s#@@VERSION@@#$(SET_VERSION)#g" -e "s#@@UPGRADE_PLATFORMS@@#$(UPGRADE_PLATFORMS)#g" $(SET_ID)_upgrade.xml > upgrade.xml

descriptor_begin: clean_pkg_lists
ifndef SET_APPS
	$(error This application set contains no applications)
endif

	awk 'BEGIN {skip = 0} /BEGIN_APPLICATIONS/ {skip = 1} (skip == 0) {print $0}' $(SET_ID).xml | sed -e "s#@@DPKG_ARCH@@#$(DPKG_ARCH)#g" -e "s#@@TARGET@@#$(target)#g" -e "s#@@VERSION@@#$(SET_VERSION)#g" > applicationSet.xml

descriptor_end: descriptor_begin $(SET_APPS)
	awk 'BEGIN {skip = 1} (skip == 0) {print $0} /END_APPLICATIONS/ {skip = 0}' $(SET_ID).xml | sed -e "s#@@DPKG_ARCH@@#$(DPKG_ARCH)#g" -e "s#@@TARGET@@#$(target)#g" -e "s#@@VERSION@@#$(SET_VERSION)#g" >> applicationSet.xml

###### Compile applications
$(SET_APPS): descriptor_begin
	rm -f $(PKG_LIST_FILE)
	$(MAKE) -C $(APPS_ROOT_DIR)/$@ target=$(target) PKG_LIST_OUTPUT="$(PWD)/$(PKG_LIST_FILE)" PKG_COPY_TO="$(PWD)"
	if [ -f $(PKG_LIST_FILE) ]; then for f in `cat $(PKG_LIST_FILE)`; do awk 'BEGIN {skip = 1} /END_APPLICATIONS/ {skip = 1} (skip == 0) {print $0} /BEGIN_APPLICATIONS/ {skip = 0}' $(SET_ID).xml | sed -e "s#@@PKG_NAME@@#$$f#g" -e "s#@@APP_ID@@#$@#g"; done; fi >> applicationSet.xml
	if [ -f $(PKG_LIST_FILE) ]; then cat $(PKG_LIST_FILE) >> $(PKG_LIST_FILE_FULL); fi

.PHONY: all $(SET_APPS) package upgrade clean_pkg_lists descriptor_begin descriptor_end upgrade_descriptor
