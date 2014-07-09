#include <gtest/gtest.h>

#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>

int main(int argc, char** argv)
{
	openlog(NULL, LOG_PERROR, LOG_USER);

	//cpIpcInit();
	//cout << "##teamcity[importData type='gtest' path='bin\\Release\\test_results.xml']" << endl;
	testing::InitGoogleTest(&argc, argv);
	int success = RUN_ALL_TESTS();
	closelog();
	if (success){
		return 1;
	}else{
		return 0;
	}
}
