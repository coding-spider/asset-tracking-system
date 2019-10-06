## Commands for generating all configurations files

# Generating Certificates
 ../../../../fabric-samples/bin/cryptogen generate --config crypto-config.yaml

# Generating genesis block
../../../../fabric-samples/bin/configtxgen -profile OrdererGenesis -outputBlock ./channel-artifacts/genesis.block

# Generating Channel Transaction
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID channelthreeorgs

# Generating Respective Anchor Peers
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputAnchorPeersUpdate ./channel-artifacts/InfrastructureAnchor.tx -channelID channelthreeorgs -asOrg InfrastructureMSP
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputAnchorPeersUpdate ./channel-artifacts/PowerAnchor.tx -channelID channelthreeorgs -asOrg PowerMSP
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputAnchorPeersUpdate ./channel-artifacts/CommunicationsAnchor.tx -channelID channelthreeorgs -asOrg CommunicationsMSP
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputAnchorPeersUpdate ./channel-artifacts/EntertainmentAnchor.tx -channelID channelthreeorgs -asOrg EntertainmentMSP
../../../../fabric-samples/bin/configtxgen -profile ChannelThreeOrgs -outputAnchorPeersUpdate ./channel-artifacts/CapitalAnchor.tx -channelID channelthreeorgs -asOrg CapitalMSP
