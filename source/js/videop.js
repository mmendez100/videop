
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
	else throw new Error("Invalid log level passed in!!! " & level);
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

	// Build the playbar, store it
	this.playbar = new Playbar(player, playBarStyle, playbarRatio, this.logger);
	this.logger.assert(this.playbar !== null, "Unable to create the playbar!");

	// Now build and draw the playhead
	this.playHead = new PlayHead(this.playbar, playHeadStyle, this.logger);
	this.logger.assert(this.playHead !== null, "Unable to create the playhead!");
};


///////// Playbar object //////////////


// Playbar constructor
function Playbar (player, playBarStyle, playbarRatio, logger) {
	// Sanity checks!
	logger.assert(playBarStyle != "", "CSS for the playbar is missing!");

	// Now we remove the existing controls
	player.removeAttribute("controls");

	// Now we create our own controls
	var playBar = document.createElement("canvas");
	logger.assert(playBar != "", "Unable to create the playBar canvas object!");
	// Add styles, and adjust as adequate
	playBar.classList.add(playBarStyle);
	playBar.width = player.offsetWidth;
	playBar.height = player.offsetHeight * playbarRatio;
	playBar.style.top = (player.offsetHeight - playBar.height) + "px";
	logger.log("Playbar dimensions: width=" + playBar.width + " height=" + playBar.height +
		" top=" + playBar.style.top,
		logger.levelsEnum.VERBOSE);
	var parent = player.parentNode;
	// Check that the video player has its DIV container. 
	logger.assert(parent.nodeName == "DIV", "No DIV container to the video player!");
	// Now attach the playBar & create the playhead
	parent.appendChild(playBar);

};


///////// Playhead object //////////////


// Playhead constructor
function PlayHead (playbar) {

	this.playbar = playbar;	// We store it for future use

	// Draw at the initial position

};



////////////////// Main ////////////////////


// We attach an instance of class Videop to the existing video player.
// specifiyng the playbar's CSS style and its size or ratio ("thickness")
var videoPlayer1 = new Videop("video1", "playbar", "playhead", 0.08);




