
#ifndef PARSING_H
#define PARSING_H

#include <glib-object.h>

void writeToHash(char* key, void* value, GType type, GHashTable *resp_struct, GValue *tmpval);

int readFromHash(char* key, void* value, GType type, GHashTable *paramshash);

int hashParamPresent(GHashTable *args, const char *fieldname);

int paramPresent(GValueArray *params, int pos);

int parseXMLToHash(const char *xmlin, GHashTable **paramshash);

#endif /* PARSING_H */
