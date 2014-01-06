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
	rm -r tests/videosFolder/*
	mocha tests --reporter dot

test-w:
	touch tests/videosFolder/newTest
	rm -r tests/videosFolder/*
	mocha tests --reporter dot --watch
