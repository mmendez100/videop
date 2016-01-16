"use strict";

//// A Utility Logger Object ////

// The level of chatter can be controlled by swapping the values placed to setLevel(),
// and additional functionality, such as writing to a div, file, or service, can be
// added to this module.

// Constructor
function Logger() {
	// We start with a silent, no log level 
	this.level = this.levelsEnum.SILENT;
};

// Member functions
Logger.prototype.levelsEnum = Object.freeze(
								{
									SILENT : {name: "QUIET", val: 3},
									MEDIUM : {name: "MEDIUM CHATTER", val: 2},
									VERBOSE : {name: "MAXIMUM CHATTER", val: 1}
								});

// Custom level setter
Logger.prototype.setLevel = function(level) {

	if (typeof level == 'undefined') level=this.levelsEnum.VERBOSE;
	this.level = level;
	console.log ("Logger level set to " + this.level.name);
	var date = new Date();
	console.log ("Logging started at: " + date.toLocaleDateString() + " " + 
		date.toLocaleTimeString());

};

// A function used to log
Logger.prototype.log = function(message, writeLevel) {

	// No need to specify VERBOSE, assume if writeLevel is missing
	if (typeof writeLevel == 'undefined') {
		writeLevel = this.levelsEnum.VERBOSE;
	}

	// Do not log if under the current level...
	if (writeLevel.val < this.level.val) return;

	// If a string object, convert to primitive to print a String and
	// not an object on the console with a string inside :)
	if (typeof(message) == "object") { message = message.valueOf(); }

	if (writeLevel >= this.level) console.log (message);	
};

// An assertion function
// This assertion function writes out, when in VERBOSE mode, the assert that
// was passed in.
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

