
#ifndef API_CALLBACKS_H
#define API_CALLBACKS_H

#include <glib-object.h>

#define SL_OK 0
#define SL_UNSPEC -1
#define SL_BADPARAM -2
#define SL_CONFIRM -3
#define SL_RECORD_NOT_FOUND -4

#define RESULT_DESCRIPTION_SIZE 255

typedef struct _ErrorInfo {
    int   code;
    char *   description;
} ErrorInfo;

/*
 * Mutex and counter to control the application running time
 */


gboolean isServerRunning();
int launchServer();
int killServer();

void applicationUninstall();

void launchServerXml(const char *xmlin, char **xmlout, ErrorInfo *result);

void ShareDeleteXml(const char *xmlin, char **xmlout, ErrorInfo *result);

void ApplicationUninstallXml(const char *xmlin, char **xmlout, ErrorInfo *result);


/*
 * setupFuncCallback
 * Called by LifeLine over dbus during the initial set up sequence.
 */
void setupFuncXml(const char *xmlin, char **xmlout, ErrorInfo *res);

/*
 * authenticateFuncCallback
 * Called by LifeLine over dbus during the authenticate process
 */
void authenticateFuncXml(const char *xmlin, char **xmlout, ErrorInfo *res);


#endif /* API_CALLBACKS_H */
