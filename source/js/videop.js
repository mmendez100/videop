
"use strict";


//// A Utility Logger Object ////

// Constructor
function Logger() {
	// We start with a silent, no log level 
	this.level = this.levelsEnum.SILENT;
};


// Member functions
Logger.prototype.levelsEnum = Object.freeze({SILENT : 0, MEDIUM : -1, VERBOSE : -2});

// Custom level setter
Logger.prototype.setLevel = function(level) {

	if (level <= this.levelsEnum.SILENT && level >= this.levelsEnum.VERBOSE) {
		this.level = level;
		console.log ("Logger level set to " + this.level);
		var date = new Date();
		console.log ("Logging started at: " + date.toLocaleDateString() + " " + 
			date.toLocaleTimeString());
		date = null;
	}
	else throw new Error("Invalid log level passed in!!! (" + level + ")");
};

// A function used to log
Logger.prototype.log = function(message,writeLevel) {
	if (writeLevel >= this.level) console.log (message);	
};

// An assertion function
Logger.prototype.assert = function(condition, message) {
	var assert_failed = !condition;
    if (assert_failed) {
        message = message || "Assertion failed!";
        console.log (message);
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
	if (this.level == this.levelsEnum.VERBOSE) {
		console.log ("Assert OK: Suppressed message [" + message + "]");
	}
};



///////// Videop object //////////////


// Constructor
function Videop(videopId, playBarStyle, playHeadStyle, playHeadStyleBold, playbarRatio)
{
	// Utility logger, we set it up to VERBOSE for development or testing, else MEDIUM
	this.logger = new Logger();
	this.logger.setLevel(this.logger.levelsEnum.VERBOSE); // Make MEDIUM for Production //

	// We associate the html player to this instance of Videop
	var player = document.getElementById(videopId);
	this.logger.assert(player !== null, "Unable to attach player to its Javascript instance!");

	// Build the playbar, store it. The playbar also includes the playhead.
	this.playbar = new Playbar(player, playBarStyle, playHeadStyle, playHeadStyleBold, 
		playbarRatio, this.logger);
	this.logger.assert(this.playbar !== null, "Unable to create the playbar!");

};


///////// Playbar object //////////////


// Playbar constructor
function Playbar (player, playBarStyle, playHeadStyle, playHeadStyleBold, playbarRatio, logger) {
	// Store logger, then do sanity checks
	this.logger = logger;
	this.logger.assert(playBarStyle != "", "CSS for the playbar is missing!");

	// Now we remove the existing controls
	player.removeAttribute("controls");

	// Now we create our own controls
	this.canvas = document.createElement("canvas");
	this.logger.assert(this.canvas != null, "Unable to create the playBar canvas object!");
	// Add styles, and adjust as adequate
	this.canvas.classList.add(playBarStyle);
	this.canvas.width = player.offsetWidth;
	this.canvas.height = player.offsetHeight * playbarRatio;
	this.canvas.style.top = (player.offsetHeight - this.canvas.height) + "px";
	this.logger.log("Playbar canvas: width=" + this.canvas.width + " height=" + 
		this.canvas.height + " top=" + this.canvas.style.top,
		this.logger.levelsEnum.VERBOSE);
	var parent = player.parentNode;
	// Check that the video player has its DIV container. 
	this.logger.assert(parent.nodeName == "DIV", "No DIV container to the video player!");
	// Now attach the playBar canvas
	parent.appendChild(this.canvas);

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

};

PlayHead.prototype.drawHead = function(relPosition, absPosition, bold) {

	// No context, we are outta here!
	if (this.canvasC == null) return;
	
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

	this.logger.log("isDraggable, current " + xMousePos + " vs, prev. " + this.xPosLast + 
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
		this.drawHead(-1, e.pageX, true);
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




