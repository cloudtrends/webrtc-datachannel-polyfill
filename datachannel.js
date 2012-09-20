(function() {

	var
		// Configuration:
		stunServer = "STUN stun.l.google.com:19302",
		websocketServer = "ws://localhost:8000/",
	
		// For browser compatibility:
		PeerConnection = window.PeerConnection || window.mozPeerConnection || window.webkitPeerConnection00;

	if (typeof(PeerConnection) === 'undefined') {
		console.error('Your browser does not support PeerConnection.');
		return;
	}

	if (typeof((new PeerConnection(stunServer, function(){})).createDataChannel) !== 'undefined') {
		// You already have DataChannel support.
		return;
	}

	function DataChannel(peerConnection) {
		this.label = '';
		this.reliable = false;
		this._peerConnection = peerConnection;

		this._webSocket = new WebSocket(websocketServer);
		this._webSocket.onclose = function() {
			// Do something!
		}

		this.readyState = "connecting";

		this._webSocket.onopen = function() {
			this._identify();
			this.readyState = "open";
		}.bind(this);

		this._webSocket.onmessage = function(msg) {
			if (this.onmessage) {
				this.onmessage(msg);
			}
		}.bind(this);
	};

	DataChannel.prototype._identify = function() {
		if (this._peerConnection === null) return false;

		function description2id(description) {
			var result = description.toSdp().replace(/(\r\n|\n|\r)/gm, '\n')
			var re = new RegExp("o=.+");
			result = re.exec(result)
			return result[0]
		}

		if (this._peerConnection._localDescription && this._peerConnection._remoteDescription) {
			this.send('connect:' + description2id(this._peerConnection._localDescription) + '_' + this.label + ':' + description2id(this._peerConnection._remoteDescription) + '_' + this.label);
		}
	};

	DataChannel.prototype.close = function() {
		this._webSocket.close();
	};

	DataChannel.prototype.send = function(data, onErrorCallback) {
		this._webSocket.send(data, onErrorCallback);
	};

	webkitPeerConnection00.prototype.createDataChannel = function(label, dataChannelDict) {
		var channel = new DataChannel(this);

		if (typeof(this._allDataChannels) == 'undefined') {
			this._allDataChannels = [];
		}
		this._allDataChannels.push(channel);

		return channel;
	}

	// Overwrite PeerConnection's description setters, to get ID:s for the websocket connections.

	var
		setLocalDescription = PeerConnection.prototype.setLocalDescription,
		setRemoteDescription = PeerConnection.prototype.setRemoteDescription;

	webkitPeerConnection00.prototype.setLocalDescription = function(type, description) {
		this._localDescription = description;
		if (typeof(this._allDataChannels) != 'undefined') {
			for (var i in this._allDataChannels) {
				this._allDataChannels[i]._identify();
			}
		}
		setLocalDescription.call(this, type, description)
	};

	webkitPeerConnection00.prototype.setRemoteDescription = function(type, description) {
		this._remoteDescription = description;
		if (typeof(this._allDataChannels) != 'undefined') {
			for (var i in this._allDataChannels) {
				this._allDataChannels[i]._identify();
			}
		};
		setRemoteDescription.call(this, type, description);
	};

}());
