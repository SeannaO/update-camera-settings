#include <gtest/gtest.h>
#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>
#include <stdbool.h>

#include <parsing.h>
#include <libsoup/soup-xmlrpc.h>
#include <libsoup/soup-value-utils.h>

class ReadAndWriteData : public testing::Test
 {
	protected:
		// Per-test-case set-up.
		// Called before the first test in this test case.
		// Can be omitted if not needed.
		static void SetUpTestCase() {
			g_type_init();
			resp_struct = soup_value_hash_new();
			tmpval = g_new0(GValue, 1);
			key = (char*)"mykey";
		}

		// Per-test-case tear-down.
		// Called after the last test in this test case.
		// Can be omitted if not needed.
		static void TearDownTestCase() {

		}
		static char* key;
		static GValue* tmpval;
		static GHashTable* resp_struct;
 };

char* ReadAndWriteData::key = NULL;
GValue* ReadAndWriteData::tmpval = NULL;
GHashTable* ReadAndWriteData::resp_struct = NULL;

TEST_F(ReadAndWriteData, readAndWriteIntTest){
	int expected = 10;
	int actual = 1;
	GType type = G_TYPE_INT;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteBooleanTest){
	gboolean expected = true;
	gboolean actual = false;
	GType type = G_TYPE_BOOLEAN;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteUIntTest){
	unsigned int expected = 10;
	unsigned int actual = 1;
	GType type = G_TYPE_UINT;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteLongTest){
	long expected = 10;
	long actual = 1;
	GType type = G_TYPE_LONG;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteULongTest){
	unsigned long expected = 10;
	unsigned long actual = 1;
	GType type = G_TYPE_ULONG;
	tmpval = g_new0(GValue, 1);
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteFloatTest){
	float expected = 10.1F;
	float actual = 1.1F;
	GType type = G_TYPE_FLOAT;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteDoubleTest){
	double expected = 10.1;
	double actual = 1.1;
	GType type = G_TYPE_DOUBLE;
	writeToHash(key, &expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_EQ(actual, expected);
}

TEST_F(ReadAndWriteData, readAndWriteStringTest){
	gchar* expected = (gchar*)"hello";
	gchar* actual = (gchar*)"world";
	GType type = G_TYPE_STRING;
	writeToHash(key, expected, type, resp_struct, tmpval);
	readFromHash(key, &actual, type, resp_struct);
	EXPECT_STREQ(actual, expected);
}

TEST_F(ReadAndWriteData, hashParamPresentTest){
	gchar* value = (gchar*)"hello";
	GType type = G_TYPE_STRING;
	writeToHash(key, value, type, resp_struct, tmpval);

	int present = hashParamPresent(resp_struct, key);
	int not_present = hashParamPresent(resp_struct, "some_key");
	EXPECT_EQ(1, present);
	EXPECT_EQ(0, not_present);
}

TEST_F(ReadAndWriteData, ParamPresentInArrayTest){
	
	GValueArray *params = g_value_array_new(2);
	
	g_value_init(tmpval, G_TYPE_INT);
	g_value_set_int(tmpval, 3);
	g_value_array_prepend(params, tmpval);

	int present = paramPresent(params, 0);
	int not_present = paramPresent(params,1);	

	EXPECT_EQ(1, present);
	EXPECT_EQ(0, not_present);

	g_value_array_free(params);
}


TEST(ParseXML, ToAHashTest){
	const char *xmlin = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><methodCall><methodName>lenovoemc_SDKApiThree</methodName><params><param><value><struct><member><name>text</name><value><string>test</string></value></member><member><name>number</name><value><int>3</int></value></member></struct></value></param></params></methodCall>";
	g_type_init();
	GHashTable *resp_struct = soup_value_hash_new();
	
	int present;

	char * text_key = (char*)"text";
	char * number_key = (char*)"number";


	char * expected_text = (char*)"test";
	int expected_number = 3;

	char * actual_text = (char*)"";
	int actual_number = 1;

	int error_code = parseXMLToHash(xmlin, &resp_struct);
	EXPECT_EQ(0,error_code);

	present = hashParamPresent(resp_struct, text_key);
	EXPECT_EQ(1, present);

	present = hashParamPresent(resp_struct, number_key);
	EXPECT_EQ(1, present);

	readFromHash(text_key, &actual_text, G_TYPE_STRING, resp_struct);
	readFromHash(number_key, &actual_number, G_TYPE_INT, resp_struct);

	EXPECT_STREQ(expected_text, actual_text);
	EXPECT_EQ(expected_number, actual_number);
}

TEST(ParseXML, NestedHashToAHashTest){
	const char *xmlin = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><methodCall><methodName>lenovoemc_SDKApiThree</methodName><params><param><value><struct><member><name>input</name><value><struct><member><name>text</name><value><string>test</string></value></member><member><name>number</name><value><int>3</int></value></member></struct></value></member></struct></value></param></params></methodCall>";
	g_type_init();
	GHashTable *resp_struct = soup_value_hash_new();
	GHashTable *paramshash = soup_value_hash_new();
	char * text;
	int number;

	int error_code = parseXMLToHash(xmlin, &resp_struct);
	EXPECT_EQ(0,error_code);


	readFromHash((char*)"input", &paramshash, G_TYPE_HASH_TABLE, resp_struct);

	readFromHash((char*)"text", &text, G_TYPE_STRING, paramshash);
	readFromHash((char*)"number", &number, G_TYPE_INT, paramshash);

	EXPECT_STREQ((char*)"test", text);
	EXPECT_EQ(3, number);
}

