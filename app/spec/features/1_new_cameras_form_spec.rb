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
		sleep(2)
		num_cameras = all(".camera-item").count

		click_link "Add Camera"

		dialog = page.find("#add-new-camera-dialog")
		dialog.should be_visible
		dialog.first(".modal-title").text.should == "add new camera"
		within("#add-new-camera-dialog") do
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
		sleep(2)
		new_num_cameras = all(".camera-item").count
		(new_num_cameras - num_cameras).should == 1
	end

	it "adds the axis camera" do
		visit camera_page
		sleep(2)
		num_cameras = all(".camera-item").count

		num_cameras = all(".camera-item").count
		click_link "Add Camera"

		page.find("#add-new-camera-dialog").should be_visible
		within("#add-new-camera-dialog") do
			fill_in "camera name", with: "Axis | Office"
			select "Axis", from: "manufacturer"
			fill_in "camera ip", with: "192.168.215.66"
			fill_in "username", with: "root"
			fill_in "password", with: "admin"
			# because script doesn't seem to execute with no keyup event
			page.execute_script("getCameraOptions(function(data){setConstraintsOnStreamFields(data, function(error){});});")
			sleep(3)
			fill_in "name", with: "high resolution"
			fill_in "framerate", with: 30
			fill_in "quality", with: 20
			# value of the field should be rtsp://192.168.215.102/
			fill_in "retention period", with: 90
			first_option = first('.camera-stream-resolution-select').first('option').text
			select first_option, from: "resolution"
			
			# click_on "check stream"
			click_on "add"
		end
		sleep(2)
		new_num_cameras = all(".camera-item").count
		(new_num_cameras - num_cameras).should == 1		
	end


	it "adds the arecont camera" do
		visit camera_page
		sleep(2)
		num_cameras = all(".camera-item").count

		click_link "Add Camera"

		page.find("#add-new-camera-dialog").should be_visible
		within("#add-new-camera-dialog") do
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
		sleep(2)
		new_num_cameras = all(".camera-item").count
		(new_num_cameras - num_cameras).should == 1		
	end

	it "adding and removing stream on a new camera" do
		visit camera_page
		sleep(2)
		click_link "Add Camera"

		page.find("#add-new-camera-dialog").should be_visible
		within("#add-new-camera-dialog") do
			num_streams = all("#stream-panes .tab-pane").count
			click_button "add stream"
			sleep(2)
			new_num_streams = all("#stream-panes .tab-pane").count
			(new_num_streams - num_streams).should == 1
			num_streams = new_num_streams
			click_button "remove stream"
			new_num_streams = all("#stream-panes .tab-pane").count
			(new_num_streams - num_streams).should == -1
		end
	end


	it "editing a camera" do
		visit camera_page
		sleep(2)
		camera_item = page.first(".camera-item")
		camera_id = camera_item[:id]
		edit_btn = camera_item.find(".camera-item-menu .edit")
		edit_btn.click


		dialog = page.find("#add-new-camera-dialog")
		dialog.should be_visible
		dialog.first(".modal-title").text.should == "edit camera"
		within("#add-new-camera-dialog") do
			fill_in "camera name", with: "Edited camera name"
			click_on "save"
		end
		sleep(2)
		page.find("##{camera_id} .camera-item-link").text.should == "Edited camera name"
	end

	it "removing a stream that already exists on a camera" do
		visit camera_page
		click_link "Add Camera"
		camera_item = page.first(".camera-item")
		edit_btn = camera_item.find(".camera-item-menu .edit")
		edit_btn.click

		page.find("#add-new-camera-dialog").should be_visible


		num_streams = all("#stream-panes .tab-pane").count
		num_streams.should > 0
		within("#add-new-camera-dialog") do
			click_button "remove stream"
		end
		sleep(2)
		page.driver.browser.switch_to.alert.accept
		sleep(2)
		new_num_streams = all("#stream-panes .tab-pane").count
		(new_num_streams - num_streams).should == -1
	end

	it "editing a camera schedule", current: true do
		visit camera_page
		sleep(2)
		camera_item = page.first(".camera-item")
		camera_id = camera_item[:id]
		schedule_btn = camera_item.find(".camera-item-menu .schedule")
		schedule_btn.click
		sleep(2)
		dialog = page.find("#camera-schedule-dialog")
		dialog.should be_visible
		within("#camera-schedule-dialog") do
			["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].each do |day_of_week|
				page.find("#schedule-#{day_of_week}-open").set("9:00")
				page.find("#schedule-#{day_of_week}-close").set("17:00")
			end
			click_on "save"
		end

		camera_item = page.find("##{camera_id}")
		# camera_id = camera_item[:id]
		schedule_btn = camera_item.find(".camera-item-menu .schedule")
		# check that the update was made
		schedule_btn.click
		sleep(2)
		dialog = page.find("#camera-schedule-dialog")
		dialog.should be_visible
		within("#camera-schedule-dialog") do
			["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].each do |day_of_week|
				page.find("#schedule-#{day_of_week}-open").value.should == "9:00"
				page.find("#schedule-#{day_of_week}-close").value.should == "17:00"
			end
			click_on "close"
		end
	end	

end