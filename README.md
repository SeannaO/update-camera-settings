api document is located at http://docs.solinkvms.apiary.io/#

Connect
========
Contains node scripts such as node.js for Connect

Requirements
--------
1. Node 0.10.45
2. x86_64 Linux (preferably Debian)

## How to Launch

1. Go to `app` folder
2. node app <videos folder> -development (optional mode, will not need authentication, so it can be run without lifeline on private computer)

## How to run tests

To Run Rspec/Capybara acceptance tests

1. install ruby if not already installed
2. Install selenium using gem
3. Install chrome web driver
	MacOS: `brew install chromedriver`
4. Install bundle
	`bundle install`
5. run specs
	`bundle exec rake spec`


To run unit tests:

* with Grunt:  `grunt mochaTest`
* with Make:  `make test` in the `app` folder
