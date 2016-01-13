"use strict";

// Constructor, Tracker Object
function Tracker(videop, playbar, logger) {

	this.logger = logger;
	this.videop = videop;
	this.playbar = playbar;

	// Our stats will be stored here...
	this.stats = {};
	this.statsBucket = 0;
	this.deltaStart = -1;
	this.videoStart = -1;

	// We create a timer to update the playhead location. 
	// Timer remains off till play begins... (if paused we will later shut it off)
	this.logger.log("Tracker constructor called! Creating timer.",	this.logger.levelsEnum.VERBOSE);
	this.headTimer = new Timer(100, this.updateHead.bind(this), this.logger);
}; 

Tracker.prototype.playing = function () {
	this.logger.log("Tracker! Starting head timer as play is in progress.",	this.logger.levelsEnum.VERBOSE);
	this.headTimer.start();
};

Tracker.prototype.paused = function () {
	this.logger.log("TTracker! Stopping head timer as video is paused.",	this.logger.levelsEnum.VERBOSE);
	this.headTimer.stop();
};

Tracker.prototype.actionEnum = Object.freeze({PLAY_BEGINS : -1, PLAY_STOPS : -2});

Tracker.prototype.updateStats = function (action) {

	// Case 1: We are paused, but now playback has started
	// Just remember when we started playing...
	if (action == this.actionEnum.PLAY_BEGINS) {
		this.deltaStart = new Date.now();
		this.videoStart = this.videop.player.currentTime; 
		return;
	}

	// Case 2: We were playing, now we are paused
	// Calculate how much we watched...
	if (action == this.actionEnum.PLAY_STOPS) {
		// How long have we been playing?
		var deltaStop = new Date.now();
		var videoStop = this.videop.player.currentTime;
		var playDelta = deltaStop - this.deltaStart;

		// Now store this
		var entry = new Array(this.deltaStart, deltaStop, playDelta, this.videoStart, videoStop);
		var statsBucketStr = this.statsBucket.toString();
		this.stats[statsBucketStr] = entry;
		
		this.logger.log("updateStats: New record!! Entry=" + statsBucketStr, 
			this.logger.levelsEnum.VERBOSE);
		this.statsBucket++;

		// Now, clear deltaStart
		this.deltaStart = NaN;
	}

}; 


Tracker.prototype.updateHead = function () {

	// First, have we been playing anything?
	if (this.videop.paused) return;

	// OK, we are playing. Update location of playhead...
	var newRelPos = (this.videop.player.currentTime / this.videop.player.duration);

	this.logger.log("updateHead: Playing in progress. rel new position of playhead= " +
		newRelPos, this.logger.levelsEnum.VERBOSE);

	this.videop.playbar.playHead.drawHead(newRelPos, -1, null);
	
}; 

