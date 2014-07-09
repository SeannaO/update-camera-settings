
#ifndef APP_KEEP_ALIVE_H
#define APP_KEEP_ALIVE_H


#define APP_KEEPALIVE_WAIT_TIME 10000000

int appKeepAliveCount();

void appKeepAliveInit();

void appKeepAlivePush();

void appKeepAlivePop();

void appKeepAliveRelease();

void waitForAndCompletePendingRequests();

#endif /* APP_KEEP_ALIVE_H */

