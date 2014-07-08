#include <gtest/gtest.h>
#include <stdio.h>
#include <stdlib.h>

#include <app_keep_alive.h>

class AppKeepAlive : public testing::Test
 {
	protected:
		// Per-test-case set-up.
		// Called before the first test in this test case.
		// Can be omitted if not needed.
		static void SetUpTestCase() {
			appKeepAliveInit();
		}

		// Per-test-case tear-down.
		// Called after the last test in this test case.
		// Can be omitted if not needed.
		static void TearDownTestCase() {
			appKeepAliveRelease();
		}
 };

TEST_F(AppKeepAlive, CountingActiveAppsTest){
	EXPECT_EQ(0,appKeepAliveCount());
	appKeepAlivePush();
	EXPECT_EQ(1,appKeepAliveCount());
	appKeepAlivePush();
	EXPECT_EQ(2,appKeepAliveCount());
	appKeepAlivePop();
	EXPECT_EQ(1,appKeepAliveCount());
	appKeepAlivePush();
	EXPECT_EQ(2,appKeepAliveCount());
	appKeepAlivePop();
	EXPECT_EQ(1,appKeepAliveCount());
	appKeepAlivePop();
	EXPECT_EQ(0,appKeepAliveCount());
}
