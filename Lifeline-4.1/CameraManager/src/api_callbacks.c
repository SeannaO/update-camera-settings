#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>
#include <signal.h>
#include <string.h>
#include <unistd.h>
#include <libgen.h>

#include "constants.h"
#include "parsing.h"

#include "api_callbacks.h"

#include <libsoup/soup-xmlrpc.h>
#include <libsoup/soup-value-utils.h>


char* getNodePId()
{
	char buf[600];
	char cwd[100];
	getcwd(cwd, sizeof cwd);
	snprintf(buf, sizeof buf, "sh cd %s; PATH=$PATH:%s ./node_modules/forever/bin/forever list |grep app.js&", cwd, cwd);
	FILE *cmd = popen(buf, "r");
	if (cmd == NULL){
		return NULL;	
	}else{
		char *line = malloc( sizeof(char) * (LEN + 1 ) );
		fgets(line, LEN, cmd);
		syslog(LOG_DEBUG, "Forever Node: %s", line);
		pclose(cmd);
		return line;
	}
}

gboolean isServerRunning()
{
	char* pid = getNodePId();
	syslog(LOG_DEBUG, "Forever Node(%d): %s", (int)strlen(pid), pid);
	syslog(LOG_DEBUG, "Forever Node: %c %c", pid[0], pid[1]);
	if (pid == NULL){
		return FALSE;
	}else{
		if ((int)strlen(pid) < 10){
			free(pid);
			return FALSE;
		}else{
			free(pid);
			return TRUE;
		}
	}
}

int killServer()
{
	char buf[400];
	char cwd[100];
	getcwd(cwd, sizeof cwd);
	snprintf(buf, sizeof buf, "sh cd %s; PATH=$PATH:%s ./node_modules/forever/bin/forever stopall&", cwd, cwd);
	syslog(LOG_DEBUG, "system call: %s", buf);
	system(buf);
	system(buf);
	syslog(LOG_DEBUG, "killing node application");
	return system("sh kill -9 $(pidof node)&");
}


int launchServer(const char* share_path)
{
	char buf[600];
	char cwd[100];
	getcwd(cwd, sizeof cwd);
	snprintf(buf, sizeof buf, "sh cd %s; PATH=$PATH:%s ./node_modules/forever/bin/forever -l forever.log -o stdout.log -e stderr.log -a app.js %s&", cwd, cwd, share_path);
	syslog(LOG_DEBUG, "system call: %s", buf);
	return system(buf);
}

void applicationUninstall()
{
	killServer();
	return;
}

void launchServerXml(const char *xmlin, char **xmlout, ErrorInfo *result){
	// check if node app is running
	int success = 0;
		//if it is running then do nothing
		//if is is not running then launch the app
	// return whether successful
	if (success < 0){
		result->code = SL_UNSPEC;
		result->description = (char*)"Setting camera status was unsuccessful.";
	}else{
		result->code = SL_OK;
	}

	return;
}

void ShareDeleteXml(const char *xmlin, char **xmlout, ErrorInfo *result)
{
	gboolean force = FALSE;
	GHashTable *paramshash = NULL;

	result->code = SL_OK;


	int error_code = parseXMLToHash(xmlin, &paramshash);
	if (error_code < 0){
		result->code = SL_UNSPEC;
		switch (error_code) {
			case -1:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "No parameters: Hash is empty");
			break;
			case -2:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "Parameters are missing");
			break;
			case -3:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "Error extracting data from deleteCameraCallback");
			break;
		}
		*xmlout = NULL;
		return;
	}

	syslog(LOG_DEBUG, "Extracted Hash Table from method call: 'ShareDeleteCallback'");

	/* Extract the arguments from the Hash Table */
	if (readFromHash((char*)"force", &force, G_TYPE_BOOLEAN, paramshash) < 0){
		syslog(LOG_DEBUG, "Error while getting the param '%s''.", "force");
		snprintf(result->description, RESULT_DESCRIPTION_SIZE,
		    "Error while getting the param '%s'.", "force");
		result->code = SL_BADPARAM;
		return;
	}else{
		syslog(LOG_DEBUG, "Force: '%s'", (TRUE == force ? "TRUE" : "FALSE"));
		/*
		 * When "force" is FALSE we may want to ask for some confirmation
		 * before proceeding with the operation. In order to do this
		 * we return an SL_CONFIRM or SL_CONFIRMCHK code. This will cause,
		 * using as example the LifeLine Web UI, a pop up to the user requesting
		 * confirmation for the operation. If the user confirms the operation
		 * a new call to this callback will be made using "force == TRUE" and in
		 * this case we proceed without asking for confirmation.
		 */
		if (FALSE == force) {
			syslog(LOG_DEBUG, "Asking for confirmation'.");
			snprintf(result->description, RESULT_DESCRIPTION_SIZE,
			    "Are you sure you want to delete this share?");
			result->code = SL_CONFIRM;
			return;
		}
	}
	return;
}

void ApplicationUninstallXml(const char *xmlin, char **xmlout, ErrorInfo *result)
{
	gboolean force = FALSE;
	gchar *app_set_id = NULL;
	GHashTable *paramshash = NULL;

	result->code = SL_OK;


	int error_code = parseXMLToHash(xmlin, &paramshash);
	if (error_code < 0){
		result->code = SL_UNSPEC;
		switch (error_code) {
			case -1:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "No parameters: Hash is empty");
			break;
			case -2:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "Parameters are missing");
			break;
			case -3:
			snprintf(result->description, RESULT_DESCRIPTION_SIZE, "Error extracting data from deleteCameraCallback");
			break;
		}
		*xmlout = NULL;
		return;
	}

	syslog(LOG_DEBUG, "Extracted Hash Table'");

	/* Extract the arguments from the Hash Table */


	if (readFromHash((char*)"id", &app_set_id, G_TYPE_STRING, paramshash) < 0){
		snprintf(result->description, RESULT_DESCRIPTION_SIZE,
		    "Error while getting the param '%s'.", "id");
		result->code = SL_BADPARAM;
		return;
	}else {

		syslog(LOG_DEBUG, "id: '%s'", app_set_id);

		/*
		 * First we check if the application set being uninstalled is the one
		 * on which our application is included.
		 */
		if (FALSE == g_str_has_suffix(app_set_id, APPSETNAME)) {
			syslog(LOG_DEBUG, "'%s' is not our application set.", app_set_id);
			result->code = SL_OK;
			return;
		}
	}

	/* Extract the arguments from the Hash Table */
	if (readFromHash((char*)"force", &force, G_TYPE_BOOLEAN, paramshash) < 0){
		syslog(LOG_DEBUG, "Error while getting the param '%s''.", "force");
		snprintf(result->description, RESULT_DESCRIPTION_SIZE,
		    "Error while getting the param '%s'.", "force");
		result->code = SL_BADPARAM;
		return;
	}else{

		syslog(LOG_DEBUG, "Force: '%s'", (TRUE == force ? "TRUE" : "FALSE"));
		/*
		 * When "force" is FALSE we may want to ask for some confirmation
		 * before proceeding with the operation. In order to do this
		 * we return an SL_CONFIRM or SL_CONFIRMCHK code. This will cause,
		 * using as example the LifeLine Web UI, a pop up to the user requesting
		 * confirmation for the operation. If the user confirms the operation
		 * a new call to this callback will be made using "force == TRUE" and in
		 * this case we proceed without asking for confirmation.
		 */
		if (FALSE == force) {
			syslog(LOG_DEBUG, "Asking for confirmation'.");
			snprintf(result->description, RESULT_DESCRIPTION_SIZE,
			    "Are you sure you want to uninstall %s?", APPID );
			result->code = SL_CONFIRM;
			return;
		}
	}

	applicationUninstall();
	return;
}


/*
 * setupFuncXml
 * Called by LifeLine over dbus during the initial set up sequence.
 */
void setupFuncXml(const char *xmlin, char **xmlout, ErrorInfo *res)
{
	printf("Received sampleSetupFunc call through IPC. input XML is=%s\n\n", xmlin);

	*xmlout = strdup(" ");

	memset(res, 0, sizeof(ErrorInfo));
	res->code = SL_OK;
}

/*
 * authenticateFuncCallback
 * Called by LifeLine over dbus during the authenticate process
 */
void authenticateFuncXml(const char *xmlin, char **xmlout, ErrorInfo *res)
{
	*xmlout = strdup(" ");
	memset(res, 0, sizeof(ErrorInfo));
	res->code = SL_OK;
}

