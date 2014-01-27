require 'spec_helper'
require 'uri'


describe 'CameraScanner', :type => :request, :js => true, :scanner => true do

	def camera_page
		"http://Administrator:password@localhost:8080"
	end

	it "Scan for cameras" do
		visit camera_page
		click_link "Scan For Cameras"
		sleep(15)
		within("#camera-list") do
			page.should have_selector(".camera-item")
			camera_item = first(".camera-item")
			camera_item.should have_selector(".camera-item-name")
			camera_item.should have_selector(".camera-item-status")
			camera_item.should have_selector(".camera-item-menu")
			# camera_item.should have_selector(".thumb-container")
		end
	end

	it "remove a camera" do
		visit camera_page
		camera_item = first(".camera-item")
		id = camera_item[:id]
		remove_btn = camera_item.find(".camera-item-menu .remove")
		remove_btn.click
		sleep(2)
		page.driver.browser.switch_to.alert.accept
		sleep(2)
		page.should_not have_selector("##{id}")
	end

	it "navigating to a camera page" do
		visit camera_page
		camera_item = first(".camera-item")
		camera_link = camera_item.find(".camera-item-link")
		camera_path = 
		camera_path = URI(camera_link[:href]).path
		camera_link.click
		current_path.should == camera_path
	end	

end