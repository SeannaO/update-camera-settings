install:
	npm install 		\
		dblite  		\
		express 		\
		look  			\
		request 		\
		socket.io		\
		ejs 			\
		fluent-ffmpeg 	\
		nedb			\
		sinon	

test:
	touch tests/videosFolder/newTest	
	rm -rf tests/videosFolder/*
	rm -rf tests/cameras_controller_test
	rm -rf tests/fixtures/cameras
	mkdir -p tests/cameras_controller_test
	mkdir -p tests/fixtures/cameras
	mocha tests --reporter dot --recursive

test-w:
	touch tests/videosFolder/newTest
	rm -r tests/videosFolder/*
	mocha tests --recursive --reporter dot --watch 
