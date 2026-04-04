export class DiscordClient {
	private socket: WebSocket | null = null;
	private clientId: string;
	private connected = false;
	private pendingActivity: any = null;
	private pid: number;

	constructor(clientId = '123456789012345678') {
		this.clientId = clientId;
		this.pid =
			typeof process !== 'undefined' && process.pid
				? process.pid
				: Math.floor(Math.random() * 10000);
	}

	public connect(port = 6463) {
		if (this.socket) {
			return;
		}

		if (port > 6472) {
			console.error('Failed to connect to Discord RPC on any port');
			return;
		}

		try {
			this.socket = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${this.clientId}`);

			this.socket.onopen = () => {
				console.log(`Connected to Discord RPC on port ${port}`);
				this.connected = true;

				if (this.pendingActivity) {
					this._sendActivity(this.pendingActivity);
					this.pendingActivity = null;
				}
			};

			this.socket.onclose = () => {
				if (!this.connected) {
					// It failed to connect, try next port
					this.socket = null;
					this.connect(port + 1);
				} else {
					console.log('Disconnected from Discord RPC');
					this.connected = false;
					this.socket = null;
					setTimeout(() => this.connect(), 5000);
				}
			};

			this.socket.onerror = (error) => {
				// Ignore errors here as they'll trigger onclose where we try the next port
			};

			this.socket.onmessage = (message) => {
				console.log('Discord RPC message:', message.data);
			};
		} catch (e) {
			console.error('Exception in Discord RPC connection:', e);
			this.socket = null;
			this.connect(port + 1);
		}
	}

	private _sendActivity(activity: any) {
		if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
			this.pendingActivity = activity;
			return;
		}

		const payload = {
			cmd: 'SET_ACTIVITY',
			args: {
				pid: this.pid,
				activity: activity,
			},
			nonce: Math.random().toString(36).substring(2, 15),
		};

		try {
			this.socket.send(JSON.stringify(payload));
		} catch (e) {
			console.error('Failed to send activity:', e);
			this.pendingActivity = activity;
			this.connected = false;
		}
	}

	public UpdateRichPresence(options: {
		SetDetails?: string;
		SetState?: string;
		SetTimestamps?: { start?: number; end?: number };
		SetAssets?: {
			large_image?: string;
			large_text?: string;
			small_image?: string;
			small_text?: string;
		};
	}) {
		const activity: any = {};

		if (options.SetDetails) activity.details = options.SetDetails;
		if (options.SetState) activity.state = options.SetState;

		if (options.SetTimestamps) {
			activity.timestamps = {};
			if (options.SetTimestamps.start) activity.timestamps.start = options.SetTimestamps.start;
			if (options.SetTimestamps.end) activity.timestamps.end = options.SetTimestamps.end;
		}

		if (options.SetAssets) {
			activity.assets = {};
			if (options.SetAssets.large_image)
				activity.assets.large_image = options.SetAssets.large_image;
			if (options.SetAssets.large_text) activity.assets.large_text = options.SetAssets.large_text;
			if (options.SetAssets.small_image)
				activity.assets.small_image = options.SetAssets.small_image;
			if (options.SetAssets.small_text) activity.assets.small_text = options.SetAssets.small_text;
		}

		this._sendActivity(activity);
	}
}
