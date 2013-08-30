var now = function () {
	return (Date.now() / 1000) >>> 0;
};


exports.setTimestampProvider = function (fn) {
	now = fn;
};


function LocalCache(resolution, options) {
	// options:
	//   maxKeys: int (null)                 (if there are more keys stored than allowed, GC cycles will be triggered early).
	//   aggressiveExpiration: bool (false)  (when true, a get() will not return an expired value, even if it still hasn't been garbage collected).

	this.resolution = resolution || 60;		// in seconds, eg: 60
	this.options = options || {};

	this.store = {};	// key: value
	this.expiry = [];
	this.keyCount = 0;
	this.timer = null;

	this.lastGcCycleTime = now();

	this.scheduleGcCycle(this.resolution);
}


exports.LocalCache = LocalCache;


LocalCache.prototype.flush = function () {
	this.store = {};
	this.expiry = [];
	this.keyCount = 0;
};


LocalCache.prototype.diagnostics = function () {
	var nextExpirationKeys = this.expiry[0] ? this.expiry[0].length : 0;

	return {
		keys: this.keyCount,
		expirationBlocks: this.expiry.length,
		resolution: this.resolution,
		nextExpiration: { keys: nextExpirationKeys, time: this.lastGcCycleTime + this.resolution }
	};
};


LocalCache.prototype.gcCycle = function () {
	var keys = this.expiry.shift();

	if (keys) {
		for (var i = 0, len = keys.length; i < len; i++) {
			var key = keys[i];

			if (this.store.hasOwnProperty(key)) {
				delete this.store[key];
				this.keyCount--;
			}
		}

		return true;
	}

	return false;
};


LocalCache.prototype.scheduleGcCycle = function (interval) {
	var that = this;

	this.timer = setTimeout(function () {
		that.gcScheduled();
	}, interval * 1000);
};


LocalCache.prototype.shutdown = function () {
	clearTimeout(this.timer);
	this.timer = null;
};


LocalCache.prototype.gcScheduled = function () {
	var currentTime = this.lastGcCycleTime + this.resolution;

	this.gcCycle();

	this.lastGcCycleTime = currentTime;

	var interval = this.lastGcCycleTime + this.resolution - now();
	if (interval <= 0) {
		interval = 1;
	}

	this.scheduleGcCycle(interval);
};


LocalCache.prototype.calcBlockIndex = function (expirationTime) {
	return ((expirationTime - this.lastGcCycleTime) / this.resolution) >>> 0;
};


LocalCache.prototype.removeFromExpiryBlock = function (key, blockIndex) {
	var block = this.expiry[blockIndex];
	if (block) {
		var index = block.indexOf(key);
		if (index !== -1) {
			block.splice(index, 1);
		}
	}
};


LocalCache.prototype.addToExpiryBlock = function (key, blockIndex) {
	var block = this.expiry[blockIndex];
	if (block) {
		block.push(key);
	} else {
		this.expiry[blockIndex] = [key];
	}
};


LocalCache.prototype.touch = function (key, ttl) {
	var value = this.store[key];
	if (value) {
		var oldBlock = null, newBlock = null, expirationTime = null;

		if (value[1]) {
			oldBlock = this.calcBlockIndex(value[1]);
		}

		if (ttl > 0) {
			expirationTime = now() + ttl;
			newBlock = this.calcBlockIndex(expirationTime);
		}

		if (oldBlock !== newBlock) {
			if (oldBlock !== null) {
				this.removeFromExpiryBlock(key, oldBlock);
			}

			if (newBlock !== null) {
				this.addToExpiryBlock(key, newBlock);
			}
		}

		if (expirationTime === null) {
			// no expiration

			delete value[1];
		} else {
			value[1] = expirationTime;
		}

		return value[0];
	}
};


LocalCache.prototype.del = function (key) {
	var value = this.store[key];
	if (value) {
		if (value[1]) {
			// we have to remove it from the block, otherwise we would be removing it at a later time as well (not desirable)

			var expiryBlock = this.calcBlockIndex(value[1]);

			this.removeFromExpiryBlock(key, expiryBlock);
		}

		delete this.store[key];
		this.keyCount--;

		return value[0];
	}
};


LocalCache.prototype.get = function (key, newTTL) {
	var value = this.store[key];
	if (value) {
		if (this.options.aggressiveExpiration && value[1] && value[1] < now()) {
			return this.del(key);
		} else {
			if (newTTL === undefined) {
				return value[0];
			}

			return this.touch(key, newTTL);
		}
	}
};


LocalCache.prototype.getExpirationTime = function (key) {
	// returns null if it doesn't expire, false if key not found

	var value = this.store[key];
	if (value) {
		return value[1] || null;
	}
};


LocalCache.prototype.add = function (key, value, ttl, touchIfExists) {
	var current = this.store[key];

	if (current) {
		if (touchIfExists) {
			return this.touch(key, ttl);
		}

		return current[0];
	}

	if (this.options.maxKeys) {
		while (this.keyCount > 0 && this.keyCount >= this.options.maxKeys) {
			// early GC cycle

			if (!this.gcCycle()) {
				// nothing to cycle
				break;
			}
		}
	}

	value = [value];

	if (ttl > 0) {
		var expirationTime = now() + ttl;

		value.push(expirationTime);

		var expiryBlock = this.calcBlockIndex(expirationTime);

		this.addToExpiryBlock(key, expiryBlock);
	}

	this.store[key] = value;
	this.keyCount++;

	return value[0];
};


LocalCache.prototype.set = function (key, value, ttl) {
	this.del(key);
	return this.add(key, value, ttl);
};

