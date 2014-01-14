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


gboolean getCurrentUser(CPSessionUser_t ** user){
	CPResult_t res;
	CPStatus_t status = cpSessionUser(&res, user);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling isAdminSession on field [%s]: %s", res.field, res.description);
		cpSessionUserFree(*user);
		return FALSE;
	}
	return TRUE;
}

gboolean loginAdmin(const gchar * login, const gchar* password){
	CPResult_t res;
	CPStatus_t status = cpSessionLogin(&res, login, password, TRUE);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling loginAdmin on field [%s]: %s", res.field, res.description);
		return FALSE;
	}
	return TRUE;
}

gboolean isSecurityEnabled(){
	CPResult_t res;
	gboolean enabled = FALSE;
	CPSecurityInfo_t *security;
	CPStatus_t status = cpSecurityInfo(&res, &security);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling isSecurityEnabled on field [%s]: %s", res.field, res.description);
		cpSecurityInfoFree(security);
		return FALSE;
	}
	enabled = security->enabled;
	cpSecurityInfoFree(security);
	return enabled;
}

gboolean enableSecurity(){
	CPSecurityEnable_t security;
	security.login = APPUSERADMINLOGIN;
	security.password = APPUSERADMINPASSWORD;
	security.fullname = APPUSERADMINNAME;
	security.encryptlocal = CP_SECENC_ALWAYS;
	security.encryptremote = CP_SECENC_ALWAYS;
	CPResult_t res;
	CPStatus_t status = cpSecurityEnable(&res, &security);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling enableSecurity on field [%s]: %s", res.field, res.description);
		return FALSE;
	}
	return TRUE;
}

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


void PoolAvailableDrives(CPPoolsDrivesInfo_t **ret){
	CPResult_t res;
	CPStatus_t status = cpPoolAvailableDrives(&res, "", TRUE, ret);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling cpPoolAvailableDrives on field [%s]: %s", res.field, res.description);
	}
}

void getPrimaryPoolId(gchar ** pool_id){
	CPResult_t res;
	GList* pools, *elem;
	CPStatus_t status = cpPools(&res, &pools);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling cpPools on field [%s]: %s", res.field, res.description);
	}
	long current_max_size = 0;
	char* tmp_pool_id = NULL;
	*pool_id = NULL;
	CPDrivePool_t* item;
	for(elem = pools; elem; elem = elem->next) {
		item = (CPDrivePool_t*)elem->data;
		syslog(LOG_DEBUG, "Id:[%s] Name:[%s] size:[%ld] rawsize:[%ld] allocated:[%ld] protection:[%d] Status:[%d] Flags:[%d] PercentComplete[%d]", item->id, item->name, item->size, item->rawsize, item->allocated, item->protection, item->status, item->flags, item->percentcomplete);
		if (current_max_size > item->size){
			current_max_size = item->size;
			tmp_pool_id = item->id;
		}
	}
	if (tmp_pool_id != NULL){
		*pool_id = (gchar *)malloc((strlen(tmp_pool_id)+1)*sizeof(gchar));
		strcpy(*pool_id, tmp_pool_id);
	}
	// clean up
	cpDrivePoolListFree(pools);
	return;
}

char * systemStoragePoolCreate(){
	CPDrivePool_t pool;
	CPPoolsDrivesInfo_t *drives_info;

	pool.name = APPSTORAGEPOOLNAME;
	GList* elem = NULL;
	PoolAvailableDrives(&drives_info);
	CPDriveDrive_t* drive_item = NULL;
	for(elem = drives_info->raidtypes; elem; elem = elem->next) {
		drive_item = (CPDriveDrive_t*)elem->data;
		syslog(LOG_DEBUG, "Position:[%d] Size:[%ld] ishdd:[%d] description:[%s] firmware:[%s] pool:[%s] Status:[%d]", drive_item->position, drive_item->size, (int)drive_item->ishdd, drive_item->description, drive_item->firmware, drive_item->pool, drive_item->status);
		if (drive_item->ishdd){
    			pool.drives = g_list_append(pool.drives, GINT_TO_POINTER(drive_item->position));
		}
	}
	CPDriveRaid_t* raid_item = NULL;
	for(elem = drives_info->drives; elem; elem = elem->next) {
		raid_item = (CPDriveRaid_t*)elem->data;
		syslog(LOG_DEBUG, "Protection:[%d] Sizecalc:[%d] Flags:[%d]", raid_item->protection, raid_item->sizecalc, raid_item->flags);
	  /* do something with item */
	}

	// Check for the supported protections	
	pool.protection = CP_PROTECTION_PARITY;
	pool.flags = CP_POOLFLAG_CONSISTENCY | CP_POOLFLAG_CACHE;
	// Check for the supported flags

	// Use all of the drives
	gchar * ret;
	CPResult_t res;
	CPStatus_t status = cpPoolCreate(&res, &pool, &ret);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling systemStoragePoolCreate on field [%s]: %s", res.field, res.description);
	}
	gchar *pool_id = (gchar *)malloc((strlen(ret)+1)*sizeof(gchar));
	strcpy(pool_id, ret);

	cpPoolsDrivesInfoFree(drives_info);
	return pool_id;
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
	syslog(LOG_DEBUG, "Allocating share");
	CPShareModify_t share;
	syslog(LOG_DEBUG, "Setting share name");
	share.name = APPSHARE;
	syslog(LOG_DEBUG, "Setting volume to NULL");
	share.volume = NULL;
	syslog(LOG_DEBUG, "Setting flag CP_FLDR_MEDIASERVER");
	share.flags = CP_FLDR_MEDIASERVER;
	syslog(LOG_DEBUG, "Share secruity");
	share.security = AT_READONLY;
	syslog(LOG_DEBUG, "Calling Create Share");
	CPStatus_t status = cpShareCreate(&res, &share);
	syslog(LOG_DEBUG, "Freeing Share");
	//cpShareModifyFree(share);
	if (status != ME_OK){
		syslog(LOG_DEBUG, "Error when calling shareCreate on field [%s]: %s", res.field, res.description);
		return FALSE;
	}
	syslog(LOG_DEBUG, "returning True");
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
	strcpy(*share_path, ret->path);
	share_path[len+1] = (char)'\0';
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
	syslog(LOG_DEBUG, "Checking if security is enabled...");
	if (!isSecurityEnabled()){
		syslog(LOG_DEBUG, "Security is not enabled. Enabling security and Creating Administrator Account...");
		if (enableSecurity()){
			syslog(LOG_DEBUG, "Security successfully enabled. Logging in Administrator...");
			if (loginAdmin("Administrator", "password")){
				syslog(LOG_DEBUG, "Successfully logged in Administrator.");
			}else{
				syslog(LOG_DEBUG, "Unable to log in Administrator.");
			}
		}else{
			syslog(LOG_DEBUG, "Unable to enable security.");
		}
	}else{
		syslog(LOG_DEBUG, "Security has already been enabled.");
	}
	
	CPSessionUser_t * user = NULL;
	syslog(LOG_DEBUG, "Checking if admin is logged in...");
	if(getCurrentUser(&user) ){//&& (user->flags & CP_LOGIN_ISADMIN)){
		//syslog(LOG_DEBUG, "Setting thread context for user: %s.", user->login);
		//cpSessionUserFree(user);
		syslog(LOG_DEBUG, "Administrator is logged in!");
	}else{
		if (user != NULL){
			cpSessionUserFree(user);
		}
		syslog(LOG_DEBUG, "Checking for solink user...");
		if (!userExists()){
			syslog(LOG_DEBUG, "User doesn't exist. Creating user...");
			if (userCreate()){
				syslog(LOG_DEBUG, "User successfully created. Logging in user...");
				if (loginAdmin(APPUSERLOGIN, APPUSERPASSWORD)){
					syslog(LOG_DEBUG, "User successfully logged in.");
				}else{
					syslog(LOG_DEBUG, "Unable to log in User.");
				}
			}else{
				syslog(LOG_DEBUG, "Unable to create user.");
			}
		}else{
			syslog(LOG_DEBUG, "User already exists.");
		}
	}
	loginAdmin("Administrator", "password");
	cpIpcSetThreadUser("Administrator");

	// gchar * pool_id;
	// syslog(LOG_DEBUG, "Checking if Pool exists and selecting the primary pool...");
	// getPrimaryPoolId(&pool_id);
	// if (pool_id != NULL){
	// 	syslog(LOG_DEBUG, "Pool does not exist creating pool...");
	// 	pool_id = systemStoragePoolCreate();
	// }


	syslog(LOG_DEBUG, "Checking drive share...");
	//if (shareExists()){
		//syslog(LOG_DEBUG, "Share doesn't exist. Creating share...");
		if (shareCreate()){
			syslog(LOG_DEBUG, "Successfully created share.");
		}else{
			syslog(LOG_DEBUG, "Share already exists.");
		}
	//}else{
	//	syslog(LOG_DEBUG, "Share already exists.");
	//}
	
	syslog(LOG_DEBUG, "Checking server...");
	if (!isServerRunning()){
		syslog(LOG_DEBUG, "Server is not running. Attempting to launching server...");
		gchar * share_path;
		if (getSharePath(&share_path) && share_path != NULL){
			syslog(LOG_DEBUG, "Launching Server with path:%s.", share_path);
			launchServer(share_path);
			if (isServerRunning()){
				syslog(LOG_DEBUG, "Successfully launched server.");
			}else{
				syslog(LOG_DEBUG, "Unable to launch server.");
			}
			g_free(share_path);
		}else{
			syslog(LOG_DEBUG, "Share path:%s.", share_path);
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

