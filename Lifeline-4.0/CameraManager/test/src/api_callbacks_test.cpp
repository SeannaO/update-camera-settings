#include <gtest/gtest.h>

#include <string.h>
#include <iostream>
#include <api_callbacks.h>

class APICallback : public testing::Test
{
protected:
	// Per-test-case set-up.
	// Called before the first test in this test case.
	// Can be omitted if not needed.
	static void SetUpTestCase() {
		g_type_init();

	}

	// Per-test-case tear-down.
	// Called after the last test in this test case.
	// Can be omitted if not needed.
	static void TearDownTestCase() {

	}
};

TEST_F(APICallback, launchServerTest){
	//Add a few cameras
	const char *xmlin = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><methodCall><methodName>solink_launch_server</methodName><params><param><value><struct/></value></param></params></methodCall>";
	const char * expected_xmlout = "";

	char * actual_xmlout = (char *)"";
	ErrorInfo result;
	launchServerXml(xmlin, &actual_xmlout, &result);
	EXPECT_STREQ(expected_xmlout, actual_xmlout);
}
