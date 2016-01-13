"use strict";

// Constructor, Tracker Object
function Tracker(videop, playbar, logger) {

	this.logger = logger;
	this.videop = videop;
	this.playbar = playbar;

	// We create a timer to update the playhead location. 
	// Timer remains off till play begins... (if paused we will later shut it off)
	this.logger.log("Tracker constructor called! Creating timer.");
	this.headTimer = new Timer(100, this.updateHead.bind(this), this.logger);
}; 

Tracker.prototype.playing = function () {
	this.logger.log("Tracker! Starting head timer as play is in progress.");
	this.headTimer.start();
};

Tracker.prototype.paused = function () {
	this.logger.log("Tracker! Stopping head timer as video is paused.");
	this.headTimer.stop();
};


Tracker.prototype.updateHead = function () {

	// First, have we been playing anything?
	if (this.videop.paused) return;

	// OK, we are playing. Update location of playhead...
	var newRelPos = (this.videop.player.currentTime / this.videop.player.duration);

	this.logger.log("updateHead: Playing in progress. rel new position of playhead= " +
		newRelPos);

	this.videop.playbar.playHead.drawHead(newRelPos, -1, null);
	
}; 

