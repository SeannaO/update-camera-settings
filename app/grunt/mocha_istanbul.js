module.exports = {
	coverage: {
		src: 'tests/**/*.js', // a folder works nicely
		options: {
		}
	},
	istanbul_check_coverage: {
		default: {
			options: {
				coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
				// check: {
				// 	lines: 80,
				// 	statements: 80
				// }
			}
		}
	}
};