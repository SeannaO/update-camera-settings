#include <syslog.h>
#include "app_keep_alive.h"


#include <glib-object.h>


GMutex *appKeepAliveMutex = NULL;
GCond *appKeepAliveCond = NULL;
gint appKeepAlive = 0;
GTimeVal appKeepAliveWait;

int appKeepAliveCount(){
	return (int)appKeepAlive;
}


void appKeepAliveInit(){
	appKeepAliveMutex = g_mutex_new();
	appKeepAliveCond = g_cond_new();
}

void appKeepAlivePush()
{
	g_mutex_lock(appKeepAliveMutex);
	appKeepAlive++;
	g_mutex_unlock(appKeepAliveMutex);
}

void appKeepAlivePop()
{
	g_mutex_lock(appKeepAliveMutex);
	appKeepAlive--;
	g_cond_signal(appKeepAliveCond);
	g_mutex_unlock(appKeepAliveMutex);
}

void appKeepAliveRelease(){
	g_mutex_free(appKeepAliveMutex);
	g_cond_free(appKeepAliveCond);
}


/*
 * Every time an API call is directed at this application, LifeLine re-starts this executable and issues the DBUS call.
 * We must make the executable wait some time before exiting to allow it to handle any incoming DBUS calls.
 * After this time, the executable can exit normally and upon a new API call LifeLine will invoke this executable again.
 *
 * In this sample we use a mechanism based on the GLib mutex and cond structures. Every API call will increment a counter
 * on its beginning and decrease it on its return. This counter is used as reference for a conditioned timed wait call
 * from GLib. While this counter is not 0 the application will not exit.
 * Once this counter reaches 0 we wait APP_KEEPALIVE_WAIT_TIME microseconds in order to give any other API call a chance
 * before exiting the application.
 */
void waitForAndCompletePendingRequests(){

	gboolean waitTimer = TRUE;
	g_mutex_lock(appKeepAliveMutex);
	while (0 != appKeepAlive || waitTimer) {
		g_get_current_time(&appKeepAliveWait);
		g_time_val_add(&appKeepAliveWait, APP_KEEPALIVE_WAIT_TIME);
		/*
		 * g_cond_timed_wait will return TRUE if the thread was woken up
		 * by a "cond" signal and FALSE if it was woken up due to a time out
		 */
		syslog(LOG_DEBUG, "Apps Alive:%d time: %ld.%ld\n", appKeepAlive, appKeepAliveWait.tv_sec, appKeepAliveWait.tv_usec);
		waitTimer = g_cond_timed_wait(appKeepAliveCond, appKeepAliveMutex, &appKeepAliveWait);
	}
	g_mutex_unlock(appKeepAliveMutex);
}
