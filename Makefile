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
	rm -r tests/videosFolder/*
	mocha tests --reporter dot

test-w:
	rm -r tests/videosFolder/*
	mocha tests --reporter dot --watch
