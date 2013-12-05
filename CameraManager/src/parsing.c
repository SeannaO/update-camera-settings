#include <stdio.h>
#include <stdbool.h>

#include <libsoup/soup-xmlrpc.h>
#include <libsoup/soup-value-utils.h>
#include <syslog.h>

#include "parsing.h"


void writeToHash(char* key, void* value, GType type, GHashTable *resp_struct, GValue *tmpval){
	g_value_init(tmpval, type);
	if(type == G_TYPE_BOOLEAN) {
		gboolean* val = (gboolean *) value;
		g_value_set_boolean(tmpval, *val);
	}else if(type == G_TYPE_INT){
		int* val = (int *) value;
		g_value_set_int(tmpval, *val);
	}else if(type == G_TYPE_UINT){
		unsigned int* val = (unsigned int *) value;
		g_value_set_uint(tmpval, *val);
	}else if(type == G_TYPE_LONG){
		long *val = (long *) value;
		g_value_set_long(tmpval, *val);
	}else if(type == G_TYPE_ULONG){
		unsigned long* val = (unsigned long *) value;
		g_value_set_ulong(tmpval, *val);
	}else if(type == G_TYPE_INT64){
		signed long *val = (signed long *) value;
		g_value_set_int64(tmpval, *val);
	}else if(type == G_TYPE_UINT64){
		unsigned long *val = (unsigned long *) value;
		g_value_set_uint64(tmpval, *val);
	}else if(type == G_TYPE_FLOAT){		
		float *val = (float *) value;
		g_value_set_float(tmpval, *val);
	}else if(type == G_TYPE_DOUBLE){
		double *val = (double *) value;
		g_value_set_double(tmpval, *val);
	}else if(type == G_TYPE_STRING){
		char* val = (char *) value;
		g_value_set_string(tmpval, val);
	}
	soup_value_hash_insert_value(resp_struct, key, tmpval);
	g_value_unset(tmpval);
}

int hashParamPresent(GHashTable *args, const char *fieldname)
{
	GValue *tmp;

	if ((tmp = (GValue *)g_hash_table_lookup(args, fieldname)) == NULL ||
	    G_VALUE_TYPE(tmp) == G_TYPE_INVALID || G_VALUE_TYPE(tmp) == G_TYPE_NONE) {
		return 0;
	}
	return 1;
}

int paramPresent(GValueArray *params, int pos)
{
	if ((unsigned int)pos >= params->n_values) {
		return 0;
	}
	GValue *tmp = g_value_array_get_nth(params, pos);
	if (tmp == NULL || G_VALUE_TYPE(tmp) == G_TYPE_INVALID || G_VALUE_TYPE(tmp) == G_TYPE_NONE) {
		return 0;
	}
	return 1;
}


int readFromHash(char* key, void* value, GType type, GHashTable *paramshash){
	/* Extract the arguments from the Hash Table */
	bool present = hashParamPresent(paramshash, key);
	if (present) {
		bool success = false;
		if(type == G_TYPE_BOOLEAN) {
			gboolean* val = (gboolean *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_INT){
			int* val = (int *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_UINT){
			unsigned int* val = (unsigned int *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_LONG){
			long *val = (long *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_ULONG){
			unsigned long* val = (unsigned long *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_INT64){
			signed long *val = (signed long *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_UINT64){
			unsigned long *val = (unsigned long *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_FLOAT){		
			float *val = (float *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_DOUBLE){
			double *val = (double *) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_STRING){
			gchar** val = (gchar **) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}else if(type == G_TYPE_HASH_TABLE){
			GHashTable ** val = (GHashTable **) value;
			success = soup_value_hash_lookup(paramshash, key, type, val);
		}
		if (!success) {
			syslog(LOG_DEBUG, "Error while getting the param '%s':", key);
			return -1;
		}

	} else {
		// no need to end the call since this is an optional variable
		syslog(LOG_DEBUG, "Parameter '%s' is missing.", "text");
		return 0;
	}
	return 1;
}

int parseXMLToHash(const char *xmlin, GHashTable **paramshash){
	char *method_name;
	GValueArray *params = NULL;

	if (soup_xmlrpc_parse_method_call(xmlin, -1, &method_name, &params) != TRUE) {
		syslog(LOG_DEBUG, "Error extracting data from method call: %s", method_name);
		g_free(method_name);
		return -3;
	}

	// Extract the Hash Table which contains the callback arguments 
	if (params->n_values > 0) {
		if (paramPresent(params, 0)) {
			if (!soup_value_array_get_nth(params, 0, G_TYPE_HASH_TABLE, paramshash)) {
				syslog(LOG_DEBUG, "No Parameters for method: '%s'", method_name);
				g_free(method_name);
				return -2;
			}
		}
	} else {
		syslog(LOG_DEBUG, "No Parameters for method: '%s'", method_name);
		g_free(method_name);
		return -1;
	}
	g_free(method_name);
	return 0;
}

