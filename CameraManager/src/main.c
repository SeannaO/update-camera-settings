/*
 * @file CameraManager_main.c
 */

/*
 * Includes
 */
#include <stdio.h>
#include <unistd.h>
#include <libgen.h>
#include <string.h>

#include <syslog.h>

#include <CP/CPapi.h>

#include "constants.h"
#include "app_keep_alive.h"
#include "api_callbacks.h"

gboolean userCreate(){
	CPUser_t user;
	user.login = APPUSERLOGIN;
	user.name = APPUSERNAME;
	user.password = APPUSERPASSWORD;
	user.quota = -1;
	user.flags = CP_USERFLAG_ISADMIN;
	CPResult_t res;
	CPStatus_t status = cpUserCreate(&res, &user);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling userCreate on field [%s]: %s", res.field, res.description);
		return FALSE;
	}
	return TRUE;
}

gboolean userExists(){
	CPResult_t res;
	gboolean ret;
	CPStatus_t status = cpUserExists(&res, APPUSERLOGIN, &ret);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling userExists on field [%s]: %s", res.field, res.description);
	}
	return ret;
}

gboolean shareCreate(){
	CPResult_t res;
	CPShareModify_t share;
	share.name = APPSHARE;
	share.flags = CP_FLDR_MEDIASERVER;
	CPStatus_t status = cpShareCreate(&res, &share);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling shareCreate on field [%s]: %s", res.field, res.description);
		return FALSE;
	}
	return TRUE;
}

gboolean shareExists(){
	CPResult_t res;
	gboolean ret;
	CPStatus_t status = cpShareExists(&res, APPSHARE, APPUSERLOGIN, &ret);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling shareExists on field [%s]: %s", res.field, res.description);
	}
	return ret;
}
gboolean getSharePath(gchar ** share_path){
	CPResult_t res;
	CPShare_t *ret;
	CPStatus_t status = cpShareInfo(&res, APPSHARE, &ret);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling shareInfo on field [%s]: %s", res.field, res.description);
		cpShareFree(ret);
		return FALSE;
	}
	int len = strlen(ret->path);
	*share_path = (gchar*)malloc(len+1);
	strncpy(*share_path, ret->path, len);
	cpShareFree(ret);
	return TRUE;
}


void launchServerCallback(const char *contextin, const char *xmlin, char **xmlout, CPResult_t *result){
	syslog(LOG_DEBUG, "contextin: %s", contextin);
	syslog(LOG_DEBUG, "xmlin: %s", xmlin);
	appKeepAlivePush();
	ErrorInfo error;
	launchServerXml(xmlin, xmlout, &error);

	if (error.code != SL_OK){
		syslog(LOG_DEBUG, "Error in launchServerCallback[%d]:%s", error.code, error.description);
		
		result->code = ME_UNSPEC;
		return;
	}

	result->code = ME_OK;
	appKeepAlivePop();
	return;
}


void ShareDeleteCallback(const char *contextin, const char *xmlin, char **xmlout, CPResult_t *result){
	syslog(LOG_DEBUG, "contextin: %s", contextin);
	syslog(LOG_DEBUG, "xmlin: %s", xmlin);
	appKeepAlivePush();
	ErrorInfo error;
	ShareDeleteXml(xmlin, xmlout, &error);

	if (error.code != SL_OK){
		syslog(LOG_DEBUG, "Error in ShareDeleteCallback[%d]:%s", error.code, error.description);
		
		result->code = ME_UNSPEC;
		return;
	}

	result->code = ME_OK;
	appKeepAlivePop();
	return;
}

void ApplicationUninstallCallback(const char *contextin, const char *xmlin, char **xmlout, CPResult_t *result){
	syslog(LOG_DEBUG, "contextin: %s", contextin);
	syslog(LOG_DEBUG, "xmlin: %s", xmlin);
	appKeepAlivePush();

	ErrorInfo error;
	ApplicationUninstallXml(xmlin, xmlout, &error);
	
	if (error.code != SL_OK){
		syslog(LOG_DEBUG, "Error in UninstallCallback[%d]:%s", error.code, error.description);
		
		result->code = ME_UNSPEC;
		return;
	}
	syslog(LOG_DEBUG, "Removing all registered application APIs...");
	
	// Deregister each of the configured SDK APIs and the callback that handles the uninstall routines
	cpIpcCleanup();
	
	result->code = ME_OK;
	appKeepAlivePop();
	return;
}

void setupAndLaunchServer(){
	syslog(LOG_DEBUG, "Checking for solink user...");
	if (!userExists()){
		syslog(LOG_DEBUG, "User doesn't exist. Creating user...");
		if (userCreate()){
			syslog(LOG_DEBUG, "User successfully created.");
		}else{
			syslog(LOG_DEBUG, "Unable to create user.");
		}
	}else{
		syslog(LOG_DEBUG, "User already exists.");
	}
	
	syslog(LOG_DEBUG, "Checking drive share...");
	if (!shareExists()){
		syslog(LOG_DEBUG, "Share doesn't exist. Creating share...");
		if (shareCreate()){
			syslog(LOG_DEBUG, "Successfully created share.");
		}else{
			syslog(LOG_DEBUG, "Share already exists.");
		}
	}else{
		syslog(LOG_DEBUG, "Share already exists.");
	}
	
	syslog(LOG_DEBUG, "Checking server...");
	if (!isServerRunning()){
		syslog(LOG_DEBUG, "Server is not running. Attempting to launching server...");
		gchar * share_path;
		if (!getSharePath(&share_path) && share_path != NULL){
			syslog(LOG_DEBUG, "Launching Server with path:%s.", share_path);
			launchServer(share_path);
			if (isServerRunning()){
				syslog(LOG_DEBUG, "Successfully launched server.");
			}else{
				syslog(LOG_DEBUG, "Unable to launch server.");
			}
			g_free(share_path);
		}else{
			syslog(LOG_DEBUG, "Could not launch server. Unable to retrieve share path.");
		}
	}else{
		syslog(LOG_DEBUG, "Server is already running.");
	}
}

/*
 * Application
 */
int
main(int argc, char **argv)
{
	/*
	 * Change to the application's directory
	 */
	chdir(dirname(argv[0]));
	setlogmask (LOG_UPTO (LOG_DEBUG));
	openlog(APPID, LOG_CONS | LOG_PERROR | LOG_PID | LOG_NDELAY, LOG_USER);
	/*
	 * Initialize libCPipc
	 */
	cpIpcInit();

	/*
 	 * Initializes the keep alive mechanism
 	 */
	appKeepAliveInit();

	cpIpcRegisterCallback("solink_launch_server", launchServerCallback);
	cpIpcRegisterCallback("solink_CameraManagerAppUninstallCallback", ApplicationUninstallCallback);
	cpIpcRegisterCallback("solink_CameraManagerShareDeleteCallback", ShareDeleteCallback);
	
	setupAndLaunchServer();

	/*
	 * Start listening to API calls
	 */
	cpIpcStartListener(APPID);

	waitForAndCompletePendingRequests();

	appKeepAliveRelease();

	cpIpcStopListener();

	cpIpcCleanup();

	closelog();

	return (0);
}

