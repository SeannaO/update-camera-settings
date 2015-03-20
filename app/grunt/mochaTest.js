module.exports = {
	test: {
		options: {
			clearRequireCache: true
		},
		src: ['tests/**/*.js', '!tests/fixtures/*', '!tests/lib/*'],
	},
};
