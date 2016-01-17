"use strict";
/*

 The purpose of the tracker object is to repaint the videohead when the user is not
 actively interacting with the video. As the video plays, the video head needs to
 move to a place proportional to the video's current time position --which in turn
 needs to be updated in a graphical location proportional to the current length of the
 playbar.

 The driver of this update is a timer, updating ten times a second (faster updates did
 not give an advantage and less updates result in choppiness). The timer is enclosed in
 its own Timer object. The timer is stopped when the user is not playing the video or 
the video ends.

*/


// Constructor, Tracker Object
function Tracker(videop, playbar, logger) {

	this.logger = logger;
	this.videop = videop;
	this.playbar = playbar;

	// We create a timer to update the playhead location. 
	// Timer remains off till play begins... (if paused we will later shut it off)
	this.logger.log("Tracker constructor called! Creating timer.");
	this.headTimer = new Timer(100, this.updateHead.bind(this), this.logger);
}
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
		prntF(newRelPos));

	this.playbar.playHead.drawHead(newRelPos, -1, null);
	
}; 

