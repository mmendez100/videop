"use strict";

/* The videop object is the main object of this project. It is attached via main.html to
 * an html5 video object. 


 */



///////// Videop object //////////////

// Constructor
function Videop(videopId, playBarStyle, playHeadStyle, playHeadStyleBold, playbarRatio)
{
	// Utility logger, we set it up to VERBOSE for development or testing, else MEDIUM
	this.logger = new Logger();
	this.logger.setLevel(this.logger.levelsEnum.MEDIUM); // Make VERBOSE for Debugging //

	// We associate the html player to this instance of Videop, save it in an internal variable
	this.player = document.getElementById(videopId);
	this.logger.assert(this.player !== null, "Unable to attach player to its Javascript instance!");

	// Build the playbar, store it. The playbar also includes the playhead.
	this.playbar = new Playbar(this, playBarStyle, playHeadStyle, playHeadStyleBold, 
		playbarRatio, this.logger);

	// Double-click plays or pauses. We start paused.
	this.paused = true;
	this.resizing = false;

	// We activate the object that tracks the video (and updates the playhead and viceversa)
	this.tracker = new Tracker(this, this.playbar, this.logger);

	// Attach the Stats object, which keeps track of intervals watched
	this.stats = new Stats(this, this.logger);

	// Handlers
	this.player.onclick = this.handleOnClick.bind(this);
	this.player.onended = this.handleOnEnded.bind(this);
	window.onresize = this.handleOnResize.bind(this);

	// Firefox, no resizes when building... do the logic.
	//if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { 
	//	this.logger.log("Firing playbar sizing logic in resize for Firefox!");
	//	this.handleOnResize();
	//}
}
Videop.prototype.pauseVideo = function () {
	this.stats.logInterval(this.stats.actionEnum.PLAY_STOPS);
	this.tracker.paused();
	this.player.pause();
	this.paused = true;
};

Videop.prototype.playVideo = function () {
	this.stats.logInterval(this.stats.actionEnum.PLAY_BEGINS);
	this.tracker.playing();
	this.player.play();
	this.paused = false;
};

Videop.prototype.handleOnEnded = function (e) {

	// The video is at the end
	this.stats.logInterval(this.stats.actionEnum.PLAY_STOPS);
	this.tracker.paused();
	this.paused = true;
	this.logger.log("handleOnEnded: Video has ended!");
};


Videop.prototype.handleOnResize = function() {
	
	// Only thing that needs resizing by hand is the playbar (and playhead as a side effect)
	// Exit if nested resizes...
	if (this.resizing) { return;}

	this.logger.log("handleOnResize: Resizing!");
	this.resizing = true;
	this.playbar.handleOnResize();
	this.resizing = false;
};

Videop.prototype.handleOnClick = function (e) {

	// Toggle between pause and play
	if (this.paused) {
		this.logger.log("handleOnClick: PLAY the video!");
		this.playVideo();
	}
	else {
		this.logger.log("handleOnClick: PAUSE the video!");
		this.pauseVideo();
	}
};


Videop.prototype.handleOnClickSeek = function(relNewPos) {
	// The user has requested a seek via a single click on the playbar...

	// If the video is paused, we will respect the user's choice.
	var paused = this.paused;

	// Pause and move.
	this.pauseVideo();
	this.logger.log("handleOnSeek: User requests video at relNewPos=" + relNewPos);
	var newTime = this.player.duration * relNewPos;
	if (newTime > this.player.duration) { newTime = this.player.duration; }
	this.player.currentTime = newTime;

	// If we were playing previously, restore playback
	if (paused == false) { this.playVideo(); }
};

Videop.prototype.handleGrabSeek = function(relNewPos) {

	// Pause and move.
	this.pauseVideo();
	this.logger.log("handleOnSeek: User requests video at relNewPos=" + relNewPos);
	var newTime = this.player.duration * relNewPos;
	if (newTime > this.player.duration) { newTime = this.player.duration; } // Do not play beyond length!
	this.player.currentTime = newTime;

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

	// Size & position the canvas, save playbar ratio in case resizing requires re-draw
	this.playbarRatio = playbarRatio;
	this.positionCanvas();

	// Now build and draw the playhead
	this.playHead = new PlayHead(this, playHeadStyle, playHeadStyleBold, this.logger);
	this.logger.assert(this.playHead !== null, "Unable to create the playhead!");

}
Playbar.prototype.positionCanvas = function () {

	// Now adjust the size and position at bottom, overlapping the video 

	var playerRect = this.videop.player.getBoundingClientRect();
	this.canvas.width = playerRect.width; 
	this.canvas.height = playerRect.height * this.playbarRatio;
	// Calculate height of playbar making sure we never under-round...
	var canvasTop = Math.round(this.videop.player.offsetHeight - this.canvas.offsetHeight + 0.5);
	this.canvas.style.top = canvasTop + "px"; 
	this.logger.log("positionCanvas: Canvas width=" + this.canvas.width + " height=" + 
		this.canvas.height + " top=" + this.canvas.style.top);
};


Playbar.prototype.handleOnResize = function () {

	this.positionCanvas();
	this.playHead.resize();
	this.playHead.drawHead (-1, -1, null, true);
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

	 // Stuff to print the time by the playbar
     this.vidTimeTextWidth = -1;
     this.vidTimeFontPx = "";
     this.xTextLeftMargin =  -1;
     this.xTextHor = -1;

    // A tolerance so that we do not need to EXACTLY hover over the playhead
    this.grabTolerance = -1;

	// As this is the first draw, the last position is non-existent.
	// Nobody is grabbing the playhead, and was not painted 'bold'
	this.xPosLast = -1;
	this.boldLast = false; 
	this.grabbed = false;
	this.pausedBeforeGrab =false;

	// Prepare for drawing, get context
	this.canvasC = this.playbar.canvas.getContext('2d');
	if (this.canvasC == null) {
		this.logger.log("No context for playhead!!!", this.logger.levelsEnum.WARN);
		return;
	}

    // Figure out dimensions of everything
	this.resize();

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
}
PlayHead.prototype.resize = function () {

    // We calculate the width of the playbar here 
    this.brushWidth = Math.round(this.playbar.canvas.width * 0.0075);
    if (this.brushWidth <= 1) { this.brushWidth = 5; } // A minimal size please!

    // Dimensions for printing the time near the playhead
    this.vidTimeTextWidth = 0; // Will be determined by the canvas context when running
    this.vidTimeFontPx = ""; // Generated later, could pass in for v2.
    this.xTextLeftMargin =  this.brushWidth * 3;
    this.xTextHor = this.playbar.canvas.height - Math.round(this.playbar.canvas.height * .20);

    // We add some tolerance so that the playhead is easier to grab
    this.grabTolerance = this.brushWidth * 2;
    this.logger.log("Playhead brushWidth="  + this.brushWidth);
    this.logger.log("Playhead grab tolerance=" + this.grabTolerance);

	// Figure out sizes of the playhead's videotime
	this.vidTimeFontPx = Math.round (this.playbar.canvas.height * 0.8) + "px sans-serif" ; // 80%
	this.canvasC.font = this.vidTimeFontPx;

};


// Draw function, uncomment log calls for debugging. Commented out for efficiency
PlayHead.prototype.drawHead = function(relPosition, absPosition, bold, force) {

	// force is an optional argument (rewrite later to avoid a slightly expensive call here...)
	if (typeof(force) == "undefined") { force = false; }

	// No context, we are outta here!
	if (this.canvasC == null) return;

	// If the head is moving because the video is moving, respect boldness
	if (bold == null) bold = this.boldLast;

	// Figure out where to draw. And draw!
	var xPos = -1;
	if (relPosition >= 0) {
		xPos = this.playbar.canvas.width * relPosition;
	//	this.logger.log("drawHead relative placement req, calculated pos to be =" + xPos +
	//		" bold: " + bold); 
	}
	if (absPosition >= 0) {
		xPos = absPosition - this.playbar.canvas.getBoundingClientRect().left;
		if (xPos <= 1) { xPos = 1; } // do not let it out of the bar...
		if (xPos + this.brushWidth >= this.playbar.canvas.width) {
			xPos =  this.playbar.canvas.width - this.brushWidth;
		}
	//	this.logger.log("drawHead absolute placement req, calculated pos to be =" + xPos +
	//		" bold: " + bold); 
	}

	// If at the end, correct as we need to consider the brush
	if (xPos + this.brushWidth > this.playbar.canvas.width) { 
		xPos = this.playbar.canvas.width - this.brushWidth
	}

	// If relPosition and absPosition both -1, re-draw existing playhead at identical location
	// but likely with different color (i.e. it is selectable due to the user hovering above)
	if (relPosition == -1 && absPosition == -1) { xPos = this.xPosLast; }


	// Now check if we really need to draw, no location and no change in styles, 
	// and the repaint is not being forced, i.e. not a repaint from a refresh, do nothing!
	if (xPos == this.xPosLast && bold == this.boldLast && force == false) { 
		this.logger.log("drawHead, nothing new to draw xPos=" + xPos + ", bold=" +
			bold +  ", returning."); 
		return;
	}
	
	// If we get here we really do need to draw.
	// First delete the previous position of the playbar, if any
	if (this.xPosLast != -1) {
		// -5 & +5 are fudge factors that let us not round when generating xPos and not
		// leave trails behind the bar as we write it...
		this.canvasC.clearRect(this.xPosLast-5,0,this.brushWidth+5,this.playbar.canvas.height);		
		// this.logger.log("Deleted playbar at x=" + this.xPosLast);

		// Now unpaint the time 
		this.canvasC.clearRect(this.xPosLast,0,this.vidTimeTextWidth.width * 1.5, this.playbar.canvas.height);
	}

	// Now draw the new one
	if (bold) { this.canvasC.fillStyle = this.playHeadStyleBold; }
		else { this.canvasC.fillStyle = this.playHeadStyle; }
	//this.logger.log("Drawing playbar at x=" + xPos + " style:" + this.canvasC.fillStyle +
	//	" grabbed: " + this.grabbed);
	this.canvasC.fillRect(xPos,0,this.brushWidth,this.playbar.canvas.height);

	// Save this drawing as the old position
	this.xPosLast = xPos;
	this.boldLast = bold;

	// Now paint the time
	var vidTime = prntF3(this.playbar.videop.player.currentTime);
	this.canvasC.fillStyle = 'white'; // Should make a parameter later
	this.vidTimeTextWidth = this.canvasC.measureText (vidTime, xPos + this.xTextLeftMargin, this.xTextHor);
	this.canvasC.fillText (vidTime, xPos + this.xTextLeftMargin, this.xTextHor);
	// this.logger.log("vidTime=" + vidTime + " vitTimeTextWidth.width=" +
    // this.vidTimeTextWidth.width + "xTextLeftMargin=" +
    // this.xTextLeftMargin + " xTextHor=" + this.xTextHor);
 
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
		", tolerance=" + this.grabTolerance + " grabable playhead: " + retVal);
	return retVal;
};

PlayHead.prototype.handleMouseOver = function(e) {

	this.logger.log("handleMouseOver");

	// If the user hovers above the playhead, we change it to show it selectable...
	if (this.isDraggable(e.pageX)) {
		this.drawHead(-1, -1, true); // User can select
	}
};

PlayHead.prototype.handleMouseOut = function(e) {

	this.logger.log("handleMouseOut");
		this.grabbed = false; // User looses the grab
		this.drawHead(-1, -1, false); // Selection is lost, but playhead stays still
};

PlayHead.prototype.handleOnMouseDown = function(e) {
	this.logger.log("handleOnMouseDown");
	if (this.isDraggable(e.pageX)) {
		this.drawHead(-1, -1, true); // Tolerance might move playbar, just make it bold.
		this.grabbed = true;
		this.pausedBeforeGrab = this.playbar.videop.paused;
		this.logger.log("handleMouseDown, the user grabbed the playbar!");
	}
};

PlayHead.prototype.handleOnMouseUp = function(e) {
	this.logger.log("handleOnMouseUp");
	if (this.grabbed) {
		this.logger.log("handleOnMouseUp, the user released the playbar!");
		this.grabbed = false; // no longer grabbing it
		this.drawHead(-1, e.pageX, false);

		// Respect the user's choice. If playing before seeking, restore.
		if (this.pausedBeforeGrab == false) this.playbar.videop.playVideo();
	}
};

PlayHead.prototype.handleOnClick = function(e) {
	this.logger.log("handleOnClick");
	this.grabbed = false; // no longer grabbing it, if we were grabbing it
	var relNewPos = e.pageX / this.playbar.canvas.width;
	this.playbar.videop.handleOnClickSeek(relNewPos);
	this.drawHead(-1, e.pageX, false); // repaint, but with new vidtime!
};

PlayHead.prototype.handleOnMouseMove = function(e) {

	// Case 1: The user has the playhead grabbed, we follow the mouse:
	if (this.grabbed) {
		this.drawHead(-1, e.pageX, true);
		var relNewPos = e.pageX / this.playbar.canvas.width;
		this.logger.log ("Playhead, user wants to move grabbed head to rel position=" + relNewPos);
		this.playbar.videop.handleGrabSeek(relNewPos);
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







