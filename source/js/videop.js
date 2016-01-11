
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
function Videop(videopId, playBarStyle, playHeadStyle, playbarRatio)
{
	// Utility logger, we set it up to VERBOSE for development or testing, else MEDIUM
	this.logger = new Logger();
	this.logger.setLevel(this.logger.levelsEnum.VERBOSE); // Make MEDIUM for Production //

	// We associate the html player to this instance of Videop
	var player = document.getElementById(videopId);
	this.logger.assert(player !== null, "Unable to attach player to its Javascript instance!");

	// Build the playbar, store it. The playbar also includes the playhead.
	this.playbar = new Playbar(player, playBarStyle, playHeadStyle, playbarRatio, this.logger);
	this.logger.assert(this.playbar !== null, "Unable to create the playbar!");

};


///////// Playbar object //////////////


// Playbar constructor
function Playbar (player, playBarStyle, playHeadStyle, playbarRatio, logger) {
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
	this.playHead = new PlayHead(this, playHeadStyle, this.logger);
	this.logger.assert(this.playHead !== null, "Unable to create the playhead!");

};




///////// Playhead object //////////////


// Playhead constructor
function PlayHead (playbar, playHeadStyle, logger) {

	// Save the logger
	this.logger = logger;

	this.playbar = playbar;	// We store a reference for the playbar for future use
	this.logger.assert(this.playbar, "No playbar passed to the playhead constructor!");

	// Save the style to apply later
	this.playHeadStyle = playHeadStyle;
	this.logger.assert(this.playHeadStyle != "", "No playhead style!");

	// We calculate the width of the playbar to 1%
	this.brushWidth = Math.round(this.playbar.canvas.width * 0.01);
	if (this.brushWidth <= 1) { this.brushWidth = 1; }
	this.grabTolerance = (this.brushWidth <= 3) ? 5 : this.brushWidth;
	this.logger.log("Playhead brushWidth=" + this.brushWidth, this.logger.levelsEnum.VERBOSE);
	this.logger.log("Playhead grab tolerance=" + this.grabTolerance, 
		this.logger.levelsEnum.VERBOSE);

	// As this is the first draw, the last position drawn is non-existent.
	this.xPosLast = -1;

	// Prepare for drawing, get context
	this.canvasC = this.playbar.canvas.getContext('2d');
	if (this.canvasC == null) {
		this.logger.log("No context for playhead!!!", this.logger.levelsEnum.WARN);
		return;
	}

	// Draw at the initial position at 0%
	this.drawHead(0);

	// And attach the handlers to manage the playhead
	// Have the playhead listen for mouseover, so that it can be dragged
	this.playbar.canvas.onmouseover = this.handleMouseOver.bind(this);

};

PlayHead.prototype.drawHead = function(relPosition) {

	// No context, we are outta here!
	if (this.canvasC == null) return;
	
	// Figure out where to draw. And draw!
	var xPos = Math.round(this.playbar.canvas.width * relPosition);

	// First delete the previous position of the playbar, if any
	if (this.xPosLast != -1) {
		this.logger.log("Deleting playbar at x=" + this.xPosLast, 
			this.logger.levelsEnum.VERBOSE);
		this.canvasC.fillStyle(this.playbar.style.background);
		this.canvasC.fillRect(xPosLast,0,this.brushWidth,this.playbar.canvas.height);		
	}

	// Now draw the new one
	this.logger.log("Drawing playbar at x=" + xPos, this.logger.levelsEnum.VERBOSE);
	this.canvasC.fillStyle = this.playHeadStyle;
	this.canvasC.fillRect(xPos,0,this.brushWidth,this.playbar.canvas.height);

	// Save this drawing as the old position
	this.xPosLast = xPos;

};

// returns true iff the mouse is above the playbar
PlayHead.prototype.isDraggable = function(xMousePos) {

	// If the brushWidth is too small, let folks drag it more easily
	var retVal = (xMousePos >= (this.xPosLast - this.tolerance) || 
		xMousePos <= (this.xPosLast + this.grabTolerance));
	this.logger.log("isDraggable, grabable playhead: " + retVal, 
		this.logger.levelsEnum.VERBOSE);
	return retVal;
};

PlayHead.prototype.handleMouseOver = function(e) {

	this.logger.log("handleMouseOver", this.logger.levelsEnum.VERBOSE);
	if (this.isDraggable(e.pageX)) {
		// Change the cursor to show that the head can be dragged
		this.playbar.canvas.style.cursor = "move";

	}

};
////////////////// Main ////////////////////


// We attach an instance of class Videop to the existing video player.
// specifiyng the playbar's CSS style and its size or ratio ("thickness")
var videoPlayer1 = new Videop("video1", "playbar", "red", 0.08);




