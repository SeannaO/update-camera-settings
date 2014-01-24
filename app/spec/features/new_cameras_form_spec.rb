# Location: spec/dummy_spec.rb

require 'spec_helper'

describe 'CameraPage', :type => :request, :js => true do

	def camera_page
		"http://Administrator:password@localhost:8080"
	end
	# def basic_auth
	# 	name = "Administrator"
	# 	password = "password"
	# 	if page.driver.respond_to?(:basic_auth)
	# 	  page.driver.basic_auth(name, password)
	# 	elsif page.driver.respond_to?(:basic_authorize)
	# 	  page.driver.basic_authorize(name, password)
	# 	elsif page.driver.respond_to?(:browser) && page.driver.browser.respond_to?(:basic_authorize)
	# 	  page.driver.browser.basic_authorize(name, password)
	# 	else
	# 	  raise "I don't know how to log in!"
	# 	end
	# end
	# def basic_auth
	# 	user = "Administrator"
	# 	password = "password"
	# 	encoded_login = ["#{user}:#{password}"].pack("m*")
	# 	page.driver.header 'Authorization', "Basic #{encoded_login}"
	# end
	it "adds the boshe camera" do
		visit camera_page
		click_link "[ add new camera ]"
		fill_in "camera name", with: "Boshe | Office"
		fill_in "camera ip", with: "192.168.215.102"
		click_on "add stream"
		# value of the field should be rtsp://192.168.215.102/
		# page.document.synchronize do
		sleep(2)
			fill_in "retention period", with: 90
		# end
		# click_on "check stream"
		click_on "add"

	end

	it "adds the axis camera" do
		visit camera_page
		click_link "[ add new camera ]"
		fill_in "camera name", with: "Axis | Office"
		select "Axis", from: "manufacturer"
		fill_in "camera ip", with: "192.168.215.66"
		fill_in "username", with: "root"
		fill_in "password", with: "admin"
		# because script doesn't seem to execute with no keyup event
		page.execute_script("getCameraOptions(function(data){setConstraintsOnStreamFields(data, function(error){});});")
		sleep(2)
		fill_in "name", with: "high resolution"
		fill_in "framerate", with: 30
		fill_in "quality", with: 20
		# value of the field should be rtsp://192.168.215.102/
		fill_in "retention period", with: 90
		puts first('.camera-stream-resolution-select')
		first_option = first('.camera-stream-resolution-select').first('option').text
		select first_option, from: "resolution"
		
		# click_on "check stream"
		click_on "add"
	end


	it "adds the arecont camera" do
		visit camera_page
		click_link "[ add new camera ]"
		fill_in "camera name", with: "Arecont | Office"
		select "Arecont", from: "manufacturer"
		fill_in "camera ip", with: "192.168.215.117"
		fill_in "username", with: "admin"
		fill_in "password", with: "admin"
		# because script doesn't seem to execute with no keyup event
		page.execute_script("getCameraOptions(function(data){setConstraintsOnStreamFields(data, function(error){});});")
		sleep(2)
		fill_in "name", with: "high resolution"
		fill_in "framerate", with: 30
		fill_in "quality", with: 20
		# value of the field should be rtsp://192.168.215.102/
		fill_in "retention period", with: 90
		puts first('.camera-stream-resolution-select')
		first_option = first('.camera-stream-resolution-select').first('option').text
		select first_option, from: "resolution"
		
		# click_on "check stream"
		click_on "add"
	end

end