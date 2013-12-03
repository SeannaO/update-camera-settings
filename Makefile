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
	mocha tests --reporter dot

test-w:
	mocha tests --reporter dot --watch
