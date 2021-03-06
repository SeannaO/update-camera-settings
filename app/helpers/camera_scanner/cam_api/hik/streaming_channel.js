var channelListXML =
        '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<StreamingChannelList version="1.0" xmlns="urn:psialliance-org">' +
        '<StreamingChannel version="1.0" xmlns="urn:psialliance-org">' +
        '    <id>101</id>' +
        '    <channelName>Solink 01</channelName>' +
        '    <enabled>true</enabled>' +
        '    <Transport>' +
        '        <rtspPortNo>554</rtspPortNo>' +
        '        <maxPacketSize>1000</maxPacketSize>' +
        '        <ControlProtocolList>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>RTSP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>HTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>SHTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '        </ControlProtocolList>' +
        '        <Unicast>' +
        '            <enabled>true</enabled>' +
        '            <rtpTransportType>RTP/TCP</rtpTransportType>' +
        '        </Unicast>' +
        '        <Multicast>' +
        '            <enabled>true</enabled>' +
        '            <destIPAddress>0.0.0.0</destIPAddress>' +
        '            <videoDestPortNo>8600</videoDestPortNo>' +
        '            <audioDestPortNo>8600</audioDestPortNo>' +
        '        </Multicast>' +
        '        <Security>' +
        '            <enabled>true</enabled>' +
        '        </Security>' +
        '    </Transport>' +
        '    <Video>' +
        '    <!-- HD Stream settings --> ' +
        '        <enabled>true</enabled>' +
        '        <videoInputChannelID>1</videoInputChannelID>' +
        '        <videoCodecType>H.264</videoCodecType>' +
        '        <videoScanType>progressive</videoScanType>' +
        '        <videoResolutionWidth>1280</videoResolutionWidth>' +
        '        <videoResolutionHeight>960</videoResolutionHeight>' +
        '        <videoQualityControlType>VBR</videoQualityControlType>' +
        '        <constantBitRate>1024</constantBitRate>' +
        '        <fixedQuality>60</fixedQuality>' +
        '        <vbrUpperCap>1024</vbrUpperCap>' +
        '        <vbrLowerCap>32</vbrLowerCap>' +
        '        <maxFrameRate>600</maxFrameRate>' +
        '        <keyFrameInterval>6000</keyFrameInterval>' +
        '        <snapShotImageType>JPEG</snapShotImageType>' +
        '        <Extensions>' +
        '            <selfExt>' +
        '                <H264Profile>High</H264Profile>' +
        '                <GovLength>12</GovLength>' +
        '                <SVC>' +
        '                    <enabled>false</enabled>' +
        '                </SVC>' +
        '                <PacketType>PS</PacketType>' +
        '                <PacketType>RTP</PacketType>' +
        '                <smoothing>50</smoothing>' +
        '            </selfExt>' +
        '        </Extensions>' +
        '    </Video>' +
        '    <Audio>' +
        '        <enabled>false</enabled>' +
        '        <audioInputChannelID>1</audioInputChannelID>' +
        '        <audioCompressionType>G.711ulaw</audioCompressionType>' +
        '    </Audio>' +
        '</StreamingChannel>' +
        '<StreamingChannel version="1.0" xmlns="urn:psialliance-org">' +
        '    <id>102</id>' +
        '    <channelName>Solink 01</channelName>' +
        '    <enabled>true</enabled>' +
        '    <Transport>' +
        '        <rtspPortNo>554</rtspPortNo>' +
        '        <maxPacketSize>1000</maxPacketSize>' +
        '        <ControlProtocolList>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>RTSP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>HTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>SHTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '        </ControlProtocolList>' +
        '        <Unicast>' +
        '            <enabled>true</enabled>' +
        '            <rtpTransportType>RTP/TCP</rtpTransportType>' +
        '        </Unicast>' +
        '        <Multicast>' +
        '            <enabled>true</enabled>' +
        '            <destIPAddress>0.0.0.0</destIPAddress>' +
        '            <videoDestPortNo>8600</videoDestPortNo>' +
        '            <audioDestPortNo>8600</audioDestPortNo>' +
        '        </Multicast>' +
        '        <Security>' +
        '            <enabled>true</enabled>' +
        '        </Security>' +
        '    </Transport>' +
        '    <Video>' +
        '    <!-- SD Stream settings --> ' +
        '        <enabled>true</enabled>' +
        '        <videoInputChannelID>1</videoInputChannelID>' +
        '        <videoCodecType>H.264</videoCodecType>' +
        '        <videoScanType>progressive</videoScanType>' +
        '        <videoResolutionWidth>704</videoResolutionWidth>' +
        '        <videoResolutionHeight>480</videoResolutionHeight>' +
        '        <videoQualityControlType>VBR</videoQualityControlType>' +
        '        <constantBitRate>128</constantBitRate>' +
        '        <fixedQuality>60</fixedQuality>' +
        '        <vbrUpperCap>128</vbrUpperCap>' +
        '        <vbrLowerCap>32</vbrLowerCap>' +
        '        <maxFrameRate>200</maxFrameRate>' +
        '        <keyFrameInterval>6000</keyFrameInterval>' +
        '        <snapShotImageType>JPEG</snapShotImageType>' +
        '        <Extensions>' +
        '            <selfExt>' +
        '                <H264Profile>Main</H264Profile>' +
        '                <GovLength>12</GovLength>' +
        '                <SVC>' +
        '                    <enabled>false</enabled>' +
        '                </SVC>' +
        '                <PacketType>PS</PacketType>' +
        '                <PacketType>RTP</PacketType>' +
        '                <smoothing>50</smoothing>' +
        '            </selfExt>' +
        '        </Extensions>' +
        '    </Video>' +
        '    <Audio>' +
        '        <enabled>false</enabled>' +
        '        <audioInputChannelID>1</audioInputChannelID>' +
        '        <audioCompressionType>G.711ulaw</audioCompressionType>' +
        '    </Audio>' +
        '</StreamingChannel>' +
        '<StreamingChannel version="1.0" xmlns="urn:psialliance-org">' +
        '    <id>103</id>' +
        '    <channelName>Solink 01</channelName>' +
        '    <enabled>true</enabled>' +
        '    <Transport>' +
        '        <rtspPortNo>554</rtspPortNo>' +
        '        <maxPacketSize>1000</maxPacketSize>' +
        '        <ControlProtocolList>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>RTSP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>HTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '            <ControlProtocol>' +
        '                <streamingTransport>SHTTP</streamingTransport>' +
        '            </ControlProtocol>' +
        '        </ControlProtocolList>' +
        '        <Unicast>' +
        '            <enabled>true</enabled>' +
        '            <rtpTransportType>RTP/TCP</rtpTransportType>' +
        '        </Unicast>' +
        '        <Multicast>' +
        '            <enabled>true</enabled>' +
        '            <destIPAddress>0.0.0.0</destIPAddress>' +
        '            <videoDestPortNo>8600</videoDestPortNo>' +
        '            <audioDestPortNo>8600</audioDestPortNo>' +
        '        </Multicast>' +
        '        <Security>' +
        '            <enabled>true</enabled>' +
        '        </Security>' +
        '    </Transport>' +
        '    <Video>' +
        '        <enabled>true</enabled>' +
        '        <videoInputChannelID>1</videoInputChannelID>' +
        '        <videoCodecType>H.264</videoCodecType>' +
        '        <videoScanType>progressive</videoScanType>' +
        '        <videoResolutionWidth>1280</videoResolutionWidth>' +
        '        <videoResolutionHeight>720</videoResolutionHeight>' +
        '        <videoQualityControlType>VBR</videoQualityControlType>' +
        '        <constantBitRate>512</constantBitRate>' +
        '        <fixedQuality>60</fixedQuality>' +
        '        <vbrUpperCap>512</vbrUpperCap>' +
        '        <vbrLowerCap>32</vbrLowerCap>' +
        '        <maxFrameRate>1500</maxFrameRate>' +
        '        <keyFrameInterval>26666</keyFrameInterval>' +
        '        <snapShotImageType>JPEG</snapShotImageType>' +
        '        <Extensions>' +
        '            <selfExt>' +
        '                <H264Profile>High</H264Profile>' +
        '                <GovLength>400</GovLength>' +
        '                <SVC>' +
        '                    <enabled>false</enabled>' +
        '                </SVC>' +
        '                <PacketType>PS</PacketType>' +
        '                <PacketType>RTP</PacketType>' +
        '                <smoothing>50</smoothing>' +
        '            </selfExt>' +
        '        </Extensions>' +
        '    </Video>' +
        '    <Audio>' +
        '        <enabled>false</enabled>' +
        '        <audioInputChannelID>1</audioInputChannelID>' +
        '        <audioCompressionType>G.711ulaw</audioCompressionType>' +
        '    </Audio>' +
        '</StreamingChannel>' +
        '</StreamingChannelList>';

exports.StreamingChannels = {
    channelListXML: channelListXML
};