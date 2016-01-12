"use strict";

///////// Videop object //////////////

// Constructor
function Videop(videopId, playBarStyle, playHeadStyle, playHeadStyleBold, playbarRatio)
{
	// Utility logger, we set it up to VERBOSE for development or testing, else MEDIUM
	this.logger = new Logger();
	this.logger.setLevel(this.logger.levelsEnum.VERBOSE); // Make MEDIUM for Production //

	// We associate the html player to this instance of Videop, save it in an internal variable
	this.player = document.getElementById(videopId);
	this.logger.assert(this.player !== null, "Unable to attach player to its Javascript instance!");

	// Build the playbar, store it. The playbar also includes the playhead.
	this.playbar = new Playbar(this, playBarStyle, playHeadStyle, playHeadStyleBold, 
		playbarRatio, this.logger);
	this.logger.assert(this.playbar !== null, "Unable to create the playbar!");

	// Double-click plays or pauses. We start paused.
	this.paused = true;
	this.player.onclick = this.handleOnClick.bind(this);
	this.player.onended = this.handleOnEnded.bind(this);

	// We activate the object that tracks the video (and updates the playhead and viceversa)
	this.tracker = new Tracker(this, this.playbar, this.logger);

};

Videop.prototype.pauseVideo = function () {
	this.player.pause();
	this.paused = true;
};

Videop.prototype.playVideo = function () {
	this.player.play();
	this.paused = false;
};


Videop.prototype.handleOnClick = function (e) {

	// Toggle between pause and play
	if (this.paused) {
		this.logger.log("handleDblcClick: PLAY the video!",	this.logger.levelsEnum.VERBOSE);
		this.playVideo();
	}
	else {
		this.logger.log("handleDblcClick: PAUSE the video!", this.logger.levelsEnum.VERBOSE);
		this.pauseVideo();
	}
};

Videop.prototype.handleOnEnded = function (e) {

	// The video is paused at the end
	this.logger.log("handleOnEnded: Video has ended!",	this.logger.levelsEnum.VERBOSE);
	this.paused = true;
};

Videop.prototype.handleOnSeek = function(relNewPos) {
	// The user has requested a seek via the playbar...

	// If the video is paused, we will respect the user's choice.
	var paused = this.paused;

	// Pause and move.
	this.pauseVideo();
	this.logger.log("handleOnSeek: User requests video at relNewPos=" + relNewPos,
		this.logger.levelsEnum.VERBOSE);
	var newTime = this.player.duration * relNewPos;
	if (newTime > this.player.duration) { newTime = this.player.duration; }
	this.player.currentTime = newTime;

	// If we were playing previously, restore playback
	if (paused == false) { this.playVideo(); }
};

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

	// We create a timer to update the playhead location
	this.logger.log("Tracker constructor called! Creating timer.",	this.logger.levelsEnum.VERBOSE);
	this.headTimer = new Timer(100, this.updateHead.bind(this), this.logger);
	this.headTimer.start();
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



///////// Playbar object //////////////


// Playbar constructor
function Playbar (videop, playBarStyle, playHeadStyle, playHeadStyleBold, playbarRatio, logger) {
	// Store logger, then do sanity checks
	this.logger = logger;
	this.logger.assert(playBarStyle != "", "CSS for the playbar is missing!");

	// Now we remove the existing controls
	this.videop = videop;
	this.videop.player.removeAttribute("controls");

	// Now we create our own canvas
	this.canvas = document.createElement("canvas");
	this.logger.assert(this.canvas != null, "Unable to create the playBar canvas object!");

	// Add the canvas to the video player (as its parent) 
	// after checking that the player has a container
	var parent = this.videop.player.parentNode;
	this.logger.assert(parent.nodeName == "DIV", "No DIV container to the video player!");
	parent.appendChild(this.canvas);

	// Add styles, will inherit position from the parent
	this.canvas.classList.add(playBarStyle);
	this.canvas.style.position = "inherit";

	// Now adjust the size and position at bottom, overlapping the video 
	var playerRect = this.videop.player.getBoundingClientRect();;
	this.canvas.width = playerRect.width; 
	this.canvas.height = playerRect.height * playbarRatio;
	// Calculate height of playbar making sure we never under-round...
	var canvasTop = Math.round(this.videop.player.offsetHeight - this.canvas.offsetHeight + 0.5);
	this.canvas.style.top = canvasTop + "px"; 
	this.logger.log("Playbar canvas: width=" + this.canvas.width + " height=" + 
		this.canvas.height + " top=" + this.canvas.style.top,
		this.logger.levelsEnum.VERBOSE);

	// Now build and draw the playhead
	this.playHead = new PlayHead(this, playHeadStyle, playHeadStyleBold, this.logger);
	this.logger.assert(this.playHead !== null, "Unable to create the playhead!");
};




///////// Playhead object //////////////


// Playhead constructor
function PlayHead (playbar, playHeadStyle, playHeadStyleBold, logger) {

	// Save the logger
	this.logger = logger;

	this.playbar = playbar;	// We store a reference for the playbar for future use
	this.logger.assert(this.playbar, "No playbar passed to the playhead constructor!");

	// Save the style to apply later
	this.playHeadStyle = playHeadStyle;
	this.playHeadStyleBold = playHeadStyleBold;
	this.logger.assert(this.playHeadStyle != "", "No playhead style!");
	this.logger.assert(this.playHeadStyleBold != "", "No bold playhead style!");

	// We calculate the width of the playbar to 1%
	this.brushWidth = Math.round(this.playbar.canvas.width * 0.01);
	if (this.brushWidth <= 1) { this.brushWidth = 5; } // A minimal size please!

	// We add some tolerance so that it is easier to grab
	this.grabTolerance = this.brushWidth * 3;
	this.logger.log("Playhead brushWidth=" + this.brushWidth, this.logger.levelsEnum.VERBOSE);
	this.logger.log("Playhead grab tolerance=" + this.grabTolerance, 
		this.logger.levelsEnum.VERBOSE);

	// As this is the first draw, the last position is non-existent.
	// Nobody is grabbing the playhead, and was not painted 'bold'
	this.xPosLast = -1;
	this.boldLast = false; 
	this.grabbed = false;

	// Prepare for drawing, get context
	this.canvasC = this.playbar.canvas.getContext('2d');
	if (this.canvasC == null) {
		this.logger.log("No context for playhead!!!", this.logger.levelsEnum.WARN);
		return;
	}

	// Draw at the initial position at 0%
	this.drawHead(0, -1, false);

	// And attach the handlers to manage the playhead
	// Have the playhead listen for mouseover, so that it can be dragged
	this.playbar.canvas.onmouseover = this.handleMouseOver.bind(this);
	this.playbar.canvas.onmouseout = this.handleMouseOut.bind(this);
	this.playbar.canvas.onmousedown = this.handleOnMouseDown.bind(this);
	this.playbar.canvas.onmouseup = this.handleOnMouseUp.bind(this);
	this.playbar.canvas.onmousemove = this.handleOnMouseMove.bind(this);
	this.playbar.canvas.onclick = this.handleOnClick.bind(this);
};

PlayHead.prototype.drawHead = function(relPosition, absPosition, bold) {

	// No context, we are outta here!
	if (this.canvasC == null) return;

	// If the head is moving because the video is moving, respect boldness
	if (bold == null) bold = this.boldLast;

	// Figure out where to draw. And draw!
	var xPos = -1;
	if (relPosition >= 0) {
		xPos = Math.round(this.playbar.canvas.width * relPosition);
		this.logger.log("drawHead relative placement req, calculated pos to be =" + xPos +
			" bold: " + bold, this.logger.levelsEnum.VERBOSE); 
	}
	if (absPosition >= 0) {
		xPos = absPosition - this.playbar.canvas.getBoundingClientRect().left;
		if (xPos <= 1) { xPos = 1; } // do not let it out of the bar...
		if (xPos + this.brushWidth >= this.playbar.canvas.width) {
			xPos =  this.playbar.canvas.width - this.brushWidth;
		}
		this.logger.log("drawHead absolute placement req, calculated pos to be =" + xPos +
			" bold: " + bold, this.logger.levelsEnum.VERBOSE); 
	}

	// If at the end, correct as we need to consider the brush
	if (xPos + this.brushWidth > this.playbar.canvas.width) { 
		xPos = this.playbar.canvas.width - this.brushWidth
	}

	// If relPosition and absPosition both -1, re-draw existing playhead at identical location
	// but likely with different color (i.e. it is selectable due to the user hovering above)
	if (relPosition == -1 && absPosition == -1) { xPos = this.xPosLast; }


	// Now check if we really need to draw, no location and no change in styles, NOP...
	if (xPos == this.xPosLast && bold == this.boldLast) { 
		this.logger.log("drawHead, nothing new to draw xPos=" + xPos + ", bold=" +
			bold +  ", returning.", this.logger.levelsEnum.VERBOSE); 
		return;
	}
	
	// If we get here we really do need to draw.
	// First delete the previous position of the playbar, if any
	if (this.xPosLast != -1) {
		this.canvasC.clearRect(this.xPosLast,0,this.brushWidth,this.playbar.canvas.height);		
		this.logger.log("Deleted playbar at x=" + this.xPosLast, 
			this.logger.levelsEnum.VERBOSE);
	}

	// Now draw the new one
	if (bold) { this.canvasC.fillStyle = this.playHeadStyleBold; }
		else { this.canvasC.fillStyle = this.playHeadStyle; }
	this.logger.log("Drawing playbar at x=" + xPos + " style:" + this.canvasC.fillStyle +
		" grabbed: " + this.grabbed, this.logger.levelsEnum.VERBOSE);
	this.canvasC.fillRect(xPos,0,this.brushWidth,this.playbar.canvas.height);


	// Save this drawing as the old position
	this.xPosLast = xPos;
	this.boldLast = bold;

};

// returns true iff the mouse is above the playbar
PlayHead.prototype.isDraggable = function(xMousePos) {

	// Get the current size of the playbar, and normalize
	var canvasR = this.playbar.canvas.getBoundingClientRect();
	xMousePos = xMousePos - canvasR.left;

	if (xMousePos < 0) {
		this.logger.log ("isDraggable, invalid calculated xPos=" + xMousePos,
			this.logger.levelsEnum.WARN);
		return false;
	}

	// If the brushWidth is too small, let folks drag it more easily
	var lbound = this.xPosLast - this.grabTolerance;
	var ubound = this.xPosLast + this.grabTolerance;
	var retVal = (xMousePos >= lbound) && (xMousePos <= ubound);

	this.logger.log("isDraggable, current=" + xMousePos + " vs, prev=" + this.xPosLast + 
		", tolerance=" + this.grabTolerance + " grabable playhead: " + retVal, 
		this.logger.levelsEnum.VERBOSE);
	return retVal;
};

PlayHead.prototype.handleMouseOver = function(e) {

	this.logger.log("handleMouseOver", this.logger.levelsEnum.VERBOSE);

	// If the user hovers above the playhead, we change it to show it selectable...
	if (this.isDraggable(e.pageX)) {
		this.drawHead(-1, -1, true); // User could select
	}
};

PlayHead.prototype.handleMouseOut = function(e) {

	this.logger.log("handleMouseOut", this.logger.levelsEnum.VERBOSE);
//	if (this.grabbed) {
		this.grabbed = false; // User looses the grab
		this.drawHead(-1, -1, false); // Selection is lost, but playhead stays still
//	}
};

PlayHead.prototype.handleOnMouseDown = function(e) {
	this.logger.log("handleOnMouseDown", this.logger.levelsEnum.VERBOSE);
	if (this.isDraggable(e.pageX)) {
		this.drawHead(-1, -1, true); // Tolerance might move playbar, just make it bold.
		this.grabbed = true;
		this.logger.log("handleMouseDown, the user grabbed the playbar!", 
			this.logger.levelsEnum.VERBOSE);
	}
};

PlayHead.prototype.handleOnMouseUp = function(e) {
	this.logger.log("handleOnMouseUp", this.logger.levelsEnum.VERBOSE);
	if (this.grabbed) {
		this.logger.log("handleOnMouseUp, the user released the playbar!", 
			this.logger.levelsEnum.VERBOSE);
		this.drawHead(-1, e.pageX, false);
		this.grabbed = false; // no longer grabbing it, if we were grabbing it	
	}
};

PlayHead.prototype.handleOnClick = function(e) {
	this.logger.log("handleOnClick", this.logger.levelsEnum.VERBOSE);
	this.grabbed = false; // no longer grabbing it, if we were grabbing it
	this.drawHead(-1, e.pageX, false);
	var relNewPos = e.pageX / this.playbar.canvas.width;
	this.playbar.videop.handleOnSeek (relNewPos);
};

PlayHead.prototype.handleOnMouseMove = function(e) {

	// Case 1: The user has the playhead grabbed, we follow the mouse:
	if (this.grabbed) {
		this.drawHead(-1, e.pageX, true);
		return;
	}

	// Case 2: The user is hovering above, switch styles to show selectable...
	if (this.isDraggable(e.pageX)) {
		this.drawHead (-1, -1, true);
		return;
	}

	// Case 3: Not selected nor draggable, we re-draw without selection
	this.drawHead (-1, -1, false);
};



////////////////// Main ////////////////////


// We attach an instance of class Videop to the existing video player.
// specifying the playbar's CSS style and its size or ratio ("thickness")
var videoPlayer1 = new Videop("video1", "playbar", "#FFD700", "#8B0000", 0.08);




