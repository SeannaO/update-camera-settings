require 'spec_helper'

describe 'Health Page', :type => :request, :js => true, :health => true do

	def camera_page
		"http://Administrator:password@localhost:8080"
	end

	def health_page
		"http://Administrator:password@localhost:8080/health"
	end	

	it "visit the Device Health page" do
		visit camera_page
		click_link "Device Health"
		sleep(2)
		current_path.should == "/health"
	end
	it "has all of the sensor info" do
		visit health_page
		sleep(2)
		within "#sensors-info" do
			sensor_labels = all(".sensor-label")
			sensor_labels.should_not be_empty
			sensor_labels.each do |label|
				[
					"CPU (temperature)",
					"CPU (voltage)",
					"Drives (temperature)",
					"Fan 1 (fan)",
					"Unit 12V (voltage)",
					"Unit 5V (voltage)",
					"Unit 3V (voltage)",
					"Battery (voltage)",
					"Memory (DDR3) (voltage)"
					].should include(label.text)
			end
		end
	end
	it "has all of the drive info" do
		visit health_page
		sleep(2)
		page.should have_selector(".tp-info")
	end

	it "has all of the smart-status info" do
		visit health_page
		sleep(2)
		within "#smart-status" do
		page.should have_selector(".smart-info")			
		end
	end

	it "can navigate back to the camera page" do
		visit health_page
		click_link "cameras"
		current_path.should == "/cameras"
	end	

end