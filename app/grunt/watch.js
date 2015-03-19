module.exports = {
	scripts: {
		files: ['**/*.js'],
		// tasks: ['mochaTest'],
		tasks: ['mocha_istanbul:coverage'],
		options: {
			// spawn: false
		}
	}
};


