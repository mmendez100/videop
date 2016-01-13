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

	// No need to specify VERBOSE, assume if writeLevel is missing
	if (typeof writeLevel == 'undefined') {
		writeLevel = this.levelsEnum.VERBOSE;
	}

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

