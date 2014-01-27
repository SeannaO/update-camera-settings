require 'spec_helper'



describe 'Multiview', :type => :request, :js => true, :multiview => true do

	def camera_page
		"http://Administrator:password@localhost:8080"
	end

	def multiview_page
		"http://Administrator:password@localhost:8080/multiview"
	end	

	it "visit the Multiview page" do
		visit camera_page
		click_link "Live"
		current_path.should == "/multiview"
	end
	it "creates a video player for each camera" do
		visit multiview_page
		within("#cameras-list") do
			page.should have_selector(".video-box")
		end
	end

	it "creates a video player for each camera" do
		visit multiview_page
		click_link "cameras"
		current_path.should == "/cameras"
	end

end