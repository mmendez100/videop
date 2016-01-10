
"use strict";


//// A Utility Logger Object ////

// Constructor
function Logger() {
	// We start with a silent, no log level 
	var level = this.levelsEnum.SILENT;
};

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
Logger.prototype.log = function(message,level) {
	if (level >= this.level) console.log (message);	
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


function Videop(videopId, playBarStyle)
{
	// Utility logger
	var logger = new Logger();
	logger.setLevel(logger.levelsEnum.VERBOSE);

	// We associate the html player to this instance of Videop
	var player = document.getElementById(videopId);
	logger.assert(player !== null, "Unable to attach player to its Javascript instance!");

	// Build the playbar
	this.buildPlaybar(player, playBarStyle, logger);

};


Videop.prototype.buildPlaybar = function(player, playBarStyle, logger)
{
	// Sanity checks!
	logger.assert(playBarStyle != "", "CSS for the playbar is missing!");

	// Build the playbar
};


////////////////// Main ////////////////////


// We attach to the existing video player
var videoPlayer1 = new Videop("video1", "#video1_playbar");




