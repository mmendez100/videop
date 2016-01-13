"use strict";


function Stats(videop, logger) {

	this.videop = videop;
	this.logger = logger;
	this.pastAction = this.actionEnum.INIT_STATE;

	// A factory to create entries on the fly
	this.entryFactory = new EntryFactory (this, videop, logger);

	// Our stats as entries will be stored here...
	this.table = new Array;
};

Stats.prototype.actionEnum = Object.freeze(
								{
									INIT_STATE : {name: "INIT_STATE"},
									PLAY_BEGINS : {name: "PLAY_BEGINS"},
									PLAY_STOPS : {name: "PLAY_STOPS"},
									PLAY_PLAY : {name: "PLAY_PLAY"}
								});

Stats.prototype.entryEnum = Object.freeze(
								{
									FINAL : {name: "FINAL"},
									IN_PROGRESS : {name: "IN_PROGRESS"}
								});

Stats.prototype.logInterval = function (action) {

	this.logger.log ("logInterval: Transitioning from " + this.pastAction.name + 
		" to " + action.name);
	var oldEntry = null;

	// Case 1: First thing the user did was move the playhead via
	// click or grab, we are transitioning from INIT_STATE to PLAY_STOPS
	// No video has been seen, which means we make note of the transition and exit.
	if (this.pastAction == this.actionEnum.INIT_STATE &&
		action == this.actionEnum.PLAY_STOPS) {
			this.logger.log("logInterval: No time viewed. User moved the playhead before any play time"); 
			// We nevertheless transition state:
			this.pastAction = this.actionEnum.PLAY_STOPS;
			return;
	}

	// Case 2: The user was in pause mode, and moved the playhead
	// and remains in pause mode. No video has been seen
	if (this.pastAction == this.actionEnum.PLAY_STOPS &&
		action == this.actionEnum.PLAY_STOPS) {
			this.logger.log("logInterval: No time viewed. Playhead moved in paused mode "); 
			// No change in state, stopped from stopped...
			return;
	}

	// Case 3: We were paused or in init state, but now playback has started
	// Make an entry, noting we started playing
	if (action == this.actionEnum.PLAY_BEGINS) {

		this.logger.log("logInterval: A view interval has been started!"); 

		// Create this interval that has begun
		var newEntry = this.entryFactory.buildEntry(this.entryEnum.IN_PROGRESS);
		this.table.push(newEntry);
				
		// The state has changed, now we are in PLAY mode
		this.pastAction = this.actionEnum.PLAY_BEGINS;
		
		return;

	}

	// Case 4: We were playing, now we are paused. Update this interval.
	if (action == this.actionEnum.PLAY_STOPS) {

		this.logger.log("logInterval: A play interval has been completed by the user!"); 

		// Grab the top entry and verify it should be IN_PROGRESS
		oldEntry = this.table.pop();
	
		// Finalize the entry
		oldEntry.update(this.entryEnum.FINAL);

		// Add it back to the table
		this.table.push(oldEntry);

		// The state is now changed to stopped
		this.pastAction = this.actionEnum.PLAY_STOPS;

		return;
	}

	// Case 5 & LAST: We are playing and we continue to play... just update this entry
	// But first, paranoid check... Are we in the right state?
	this.logger.assert(action == this.actionEnum.PLAY_PLAY, "Coding error! Invalid state/action!!!")

	// An interim interval exists, not yet completed. It should always be the last array entry
	// Grab the top entry and verify it should be IN_PROGRESS
	oldEntry = this.table.pop();
	
	// Update the entry, still in progress
	// echo it to the console via the log
	this.logger.log("logInterval: An on-going view interval is being updated via timer!"); 
	oldEntry.update(this.entryEnum.IN_PROGRESS);

	// Add it back to the table
	this.table.push(oldEntry);

	// The state remains as PLAY_PLAY, no change);

}; 

// Build a 'factory' that will create entries on demand
function EntryFactory (stats, videop, logger) {

	this.stats = stats;
	this.videop = videop;
	this.logger = logger;
	this.entryID = 1;

	this.logger.log ("EntryFactory: ready to build Entry objects when required")
}

// An entry constructor, with the interval number, its type, and reported video start
EntryFactory.prototype.buildEntry = function (curType)
{
	// Check, a new entry must be of type IN_PROGRESS
	this.logger.assert(curType == this.stats.entryEnum.IN_PROGRESS);  

	// OK, now compute a more accurate start time based on the relative position of the playhead
	var accurateStart = this.videop.playbar.playHead.getPreciseVideoTime();

	// ...but also get the 1 second less accurate currentTime, just to have it
	var videoStart = this.videop.player.currentTime;

	// Finally, build the entry!
	var entry = new Entry(this.stats, this.entryID++, curType, accurateStart, videoStart, this.logger);

	this.logger.log(entry.getHeader());
	this.logger.log(entry.toString());
	return entry;
};


function Entry (stats, ID, curType, accurateStart, videoStart, logger)
{
	this.stats = stats;
	this.logger = logger;
	this.ID = ID;
	this.curType = curType;
	this.accurateStart = accurateStart;
	this.accurateStop = -1;
	this.delta = -1;
	this.videoStart = videoStart;
	this.videoStop = -1;
	this.videoApproxDelta = -1;
};

// Update and close this entry / video interval
Entry.prototype.update = function (curType) {

	// Check, this entry must be of type IN_PROGRESS, cannot update a finalized entry!
	this.logger.assert(this.curType !== this.stats.entryEnum.FINAL);  

	// OK, now compute a more accurate stop time based on the relative position of the playhead
	this.accurateStop = this.stats.videop.playbar.playHead.getPreciseVideoTime();
	this.delta = this.accurateStop - this.accurateStart;

	// ...but also get the 1 second less accurate currentTime, just to have it
	this.videoStop = this.stats.videop.player.currentTime;
	this.videoApproxDelta = this.videoStop - this.videoStart;

	// Finally, update the entry!
	this.curType = curType;

	this.logger.log(this.getHeader(), this.logger.levelsEnum.WARN);
	this.logger.log(this.toString(), this.logger.levelsEnum.WARN);
	return this;

};

Entry.prototype.getHeader = function () {

	return "Seg#\tType:\tStart(mS)\tStop(mS)\tDelta(mS)\tVideoStart(s)\tVideoStop(s)\tVideoApproxDelta(s)";
};


Entry.prototype.toString = function () {

	var str = this.ID + "\t\t" +
		this.curType.name + "\t" +
		this.accurateStart.toPrecision(6) + "\t\t" +
		(this.accurateStop == -1 ? "[TBD]" : this.accurateStop.toPrecision(6)) + "\t\t" +
		(this.delta == -1 ? "[TBD]" : this.delta.toPrecision(6)) + "\t\t" +
		this.videoStart + "\t\t\t\t" +
		(this.videoStop == -1 ? "[TBD]" : this.videoStop) + "\t\t\t" +
	    (this.videoApproxDelta == -1 ? "[TBD]" : this.videoApproxDelta);

	return str;
};

Entry.prototype.getType = function () {

	return this.curType;
}