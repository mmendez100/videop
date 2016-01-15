"use strict";


function Stats(videop, logger) {

	this.logger = logger;
	this.videop = videop;
	this.logger.assert(this.videop instanceof Videop, "Stats: Missing videop!");
	this.pastAction = this.actionEnum.INIT_STATE;

	// A factory to create entries on the fly
	this.entryFactory = new EntryFactory (this, videop, logger);

	// Each viewed interval will be stored here...
	this.table = new Array();

	// A tally of times viewed, reviewed is kept here...
	this.tally = new Tally(this, this.logger);

	this.logger.log("Stats constructor called! Creating stats update timer.");
	this.peekTimer = new Timer(5000, this.peekStats.bind(this), this.logger);

};

// The purpose of peek Stats is to check often to detect when 25% view has been reached
// even if the user is playing the video. 
Stats.prototype.peekStats = function () {

	// Traverse AND compute temporary stats

	this.logger.log ("Statistics: PEEKing into stats via timer")
	var tempTally = new Tally(this, this.logger, true);

	this.printTable();

	this.table.forEach(function(e,i,a){
		tempTally.add(e);
	}, this);

	this.printTable();
	tempTally.traverse();
	tempTally = null;

}

Stats.prototype.startPeeking = function () {
	this.logger.log("Stats! Starting peek timer as play is in progress.");
	this.peekTimer.start();
};

Stats.prototype.stopPeeking = function () {
	this.logger.log("Stats! Stopping peek timer as video is paused.");
	this.peekTimer.stop();
};


Stats.prototype.printTable = function () {

	this.logger.log ("----------------");
	this.logger.log ((new Entry).getHeader("Statistics"));
	this.table.forEach(function(e,i,a){
		this.logger.log(e.toString("Statistics"));
	}, this);
}


Stats.prototype.actionEnum = Object.freeze(
								{
									INIT_STATE : {name: "INIT_STATE"},
									PLAY_BEGINS : {name: "PLAY_BEGINS"},
									PLAY_STOPS : {name: "PLAY_STOPS"},
									PLAY_PLAY : {name: "PLAY_PLAY"}
								});


Stats.prototype.logInterval = function (action) {

	this.logger.log ("Stats: Transitioning from " + this.pastAction.name + 
		" to " + action.name);
	var oldEntry = null;

	// Case 1: First thing the user did was move the playhead via
	// click or grab, we are transitioning from INIT_STATE to PLAY_STOPS
	// No video has been seen, which means we make note of the transition and exit.
	if (this.pastAction == this.actionEnum.INIT_STATE &&
		action == this.actionEnum.PLAY_STOPS) {
			this.logger.log("Stats: No time viewed. User moved the playhead before any play time"); 
			// We nevertheless transition state:
			this.pastAction = this.actionEnum.PLAY_STOPS;
			return;
	}

	// Case 2: The user was in pause mode, and moved the playhead
	// and remains in pause mode. No video has been seen
	if (this.pastAction == this.actionEnum.PLAY_STOPS &&
		action == this.actionEnum.PLAY_STOPS) {
			this.logger.log("Stats: No time viewed. Playhead moved in paused mode "); 
			// No change in state, stopped from stopped...
			return;
	}

	// Case 3: We were paused or in init state, but now playback has started
	// Make an entry, noting we started playing
	if (action == this.actionEnum.PLAY_BEGINS) {

		this.logger.log("Stats: A view interval has been started!"); 

		// Create this interval that has begun
		var newEntry = this.entryFactory.buildEntry();
		this.table.push(newEntry);
				
		// The state has changed, now we are in PLAY mode
		this.pastAction = this.actionEnum.PLAY_BEGINS;

		// Fire timer
		this.startPeeking();		
		return;

	}

	// Case 4: We were playing, now we are paused. Update this interval.
	if (action == this.actionEnum.PLAY_STOPS) {

		this.logger.log("Stats: A play interval has been completed by the user!"); 

		// Stop peek timer
		this.stopPeeking();

		// Grab the top entry and verify it should be IN_PROGRESS
		oldEntry = this.table.pop();
	
		// Finalize the entry
		oldEntry.update(oldEntry.entryEnum.COMPLETED);

		// Add it back to the table
		this.table.push(oldEntry);

		// Add it to our total tally
		this.tally.add(oldEntry);
		this.printTable();
		this.tally.traverse();

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
	this.logger.log("Stats: An on-going view interval is being updated via timer!"); 
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
EntryFactory.prototype.buildEntry = function ()
{

	// ...but also get the 1 second less accurate currentTime, just to have it
	var videoStart = this.videop.player.currentTime;

	// Finally, build the entry!
	var entry = new Entry(this.stats, this.entryID++, videoStart, this.logger);

	this.logger.log(entry.getHeader("EntryFactory"));
	this.logger.log(entry.toString("EntryFactory"));
	return entry;
};

Entry.prototype.entryEnum = Object.freeze(
								{
									IN_PROGRESS :      {name: "ENTRY_IN_PROGRESS"}, 
									COMPLETED :        {name: "ENTRY_NOW_COMPLETE"},
									START_AGGREGATED : {name: "START__AGGREGATED"},
									FULLY_AGGREGATED : {name: "FULLY__AGGREGATED"}
								});

function Entry (stats, ID, videoStart, logger)
{
	this.stats = stats;
	this.logger = logger;
	this.ID = ID;
	this.curType = this.entryEnum.IN_PROGRESS;
	this.delta = -1;
	this.videoStart = videoStart;
	this.videoStop = -1;
};

// Update and close this entry / video interval
Entry.prototype.update = function (curType) {

	// Cannot call update() on anything but a COMPLETED entry!
	this.logger.assert(this.curType == this.entryEnum.IN_PROGRESS);  

	// Figure out delta
	this.videoStop = this.stats.videop.player.currentTime;
	this.delta = this.videoStop - this.videoStart;

	// Finally, update the entry!
	this.curType = curType;

	this.logger.log(this.getHeader("Entry, Update"), this.logger.levelsEnum.WARN);
	this.logger.log(this.toString("Entry, Update"), this.logger.levelsEnum.WARN);
	return this;

};

Entry.prototype.getHeader = function (header) {

	return header + ": Seg#\tType:\t\t\t\tVideoStart(s)\t\tVideoStop(s)\tDelta(s)";
};


Entry.prototype.toString = function (header) {

	var str = header +": " + this.ID + "\t\t" +
		this.curType.name + "\t\t" +
		prntF(this.videoStart) + "\t\t\t" +
		(this.videoStop == -1 ? "[TBD]" : prntF(this.videoStop)) + "\t\t" +
	    (this.delta == -1 ? "[TBD]" : prntF(this.delta));

	return str;
};


Tally.prototype.nodeEnum = Object.freeze(
								{
									START : {name: "START"}, 
									STOP : {name: "STOP"},
									DUMMY : {name: "DUMMY"}
								});


// Constructor
function Tally (stats, logger, estimate) {

	// Member variables & some sanity checks
	this.logger = logger;
	this.stats = stats;
	this.logger.assert(this.stats instanceof Stats, "Tally: Missing stats object!");
	this.estimate = estimate;
	if (estimate == true) {
		this.logger.log("Tally: A temporary Tally for estimation has been created!");
	}

	// A node factory
	this.nodeFactory = new TallyNodeFactory(this.logger);
	this.viewedOnce = -1;
	this.viewedTwice = -1;
	this.viewedThreePlus = -1;

	// An init linked list that holds segments watched
	var dummyStart = this.nodeFactory.create(Number.MAX_VALUE * -1, this.nodeEnum.DUMMY);
	var dummyStop = this.nodeFactory.create(Number.MAX_VALUE, this.nodeEnum.DUMMY);
	dummyStart.nextNode = dummyStop;
	dummyStop.prevNode = dummyStart;
	this.list = dummyStart;

};

// Add a time interval to the total time we have watched, re-watched, etc.
Tally.prototype.add = function(entry) {

	// Make sure we do not add entries twice! Check is active only if not estimating
	if (this.estimate == false) {
		this.logger.assert(entry.curType == entry.entryEnum.COMPLETED, "Tally: Not completed entry passed to Tally.add()!")
	}

	// Add into our internal customized linked list holding all segments
	var newNode = null;
	var i = this.list;
	var inserted = false;
	// We begin traversing at the first node
	// while there are nodes in the list
	// Insert the start time
	while (i != null && inserted == false) {
		// If we have not added this entry's videoStart...
		if ((entry.curType == entry.entryEnum.COMPLETED || this.estimate == true)
			&& this.isSmaller(entry.videoStart, i.timePoint, entry.curType)) {

			this.insertBeforeIth(i, entry.videoStart, this.nodeEnum.START);

			// Make note we added this videoStart for this entry (for debugging)
			if (this.estimate == false) { entry.curType = entry.entryEnum.START_AGGREGATED; }

			// break loop
			inserted = true;
		}
	// Otherwise go on to the next node, see if it goes there
	i = i.nextNode;
	}

	// Now, repeat, to insert the stop times..
	i = this.list;
	inserted = false;
	while (i != null && inserted == false) {
		// If we have not added this entry's videoStart...
		if ((entry.curType == entry.entryEnum.START_AGGREGATED || this.estimate == true)
			&& this.isSmaller(entry.videoStop, i.timePoint, entry.curType)) {

			this.insertBeforeIth(i, entry.videoStop, this.nodeEnum.STOP);

			// Make note we added this videoStop
			if (this.estimate == false) { entry.curType = entry.entryEnum.FULLY_AGGREGATED; }

			// break loop
			inserted = true;
		}
	// Otherwise go on to the next node, see if it goes there
	i = i.nextNode;
	}

};

Tally.prototype.isSmaller = function (a, b, typeA) {

	// STOP always goes before START
	if (a < b) { return true; }
	if (a == b) { return (typeA == this.nodeEnum.STOP ? true : false); }
	return false;

}

Tally.prototype.insertBeforeIth = function(i, time, type) {

	// Build a new node
	var newNode = this.nodeFactory.create(time, type);
			
	// Attach before the ith node
	newNode.nextNode = i.prevNode.nextNode;	

	// Place after of the prev node
	i.prevNode.nextNode = newNode;
	newNode.prevNode = i.prevNode;
	i.prevNode = newNode;
}


Tally.prototype.traverse = function () {

	var depthLevel = 0;
	var prevDepthLevel = 0;
	var tPrev = 0;
	var delta = 0;
	this.viewedOnce = 0;
	this.viewedTwice = 0;
	this.viewedThreePlus = 0;


	this.logger.log ("Statistics: -------------------");

	// Visit all nodes and print them out
	var i = this.list;
	while (i != null) {

		// Skip dummy head and tail of linked list.
		if (i.type == this.nodeEnum.DUMMY) { i = i.nextNode; continue; }

		// Convert ith entry to a string
		var str = i.toString();

		// A change in depth level always occurs for each node in the list, up or down
		if (i.type == this.nodeEnum.START) { depthLevel++; }
		if (i.type == this.nodeEnum.STOP) { depthLevel--; }

		// Calculate the time difference
		delta = i.timePoint - tPrev;

		// Transitions indicate what sort of time event this is
		if (prevDepthLevel == 1 && depthLevel == 0 
			|| prevDepthLevel == 1 && depthLevel == 2 ) {
			// delta contains time viewed once
			this.viewedOnce = this.viewedOnce + delta;
			str = str + "\tTime Delta Viewed Once:    " + prntF(delta);
		}
		if (prevDepthLevel == 2 && depthLevel == 1 
			|| prevDepthLevel == 2 && depthLevel == 3) {
			this.viewedTwice = this.viewedTwice + delta;
			str = str + "\tTime Delta Viewed Twice:   " + prntF(delta);
		}
		if (prevDepthLevel >= 3 && (prevDepthLevel - depthLevel == 1)
			|| prevDepthLevel >= 3 && (prevDepthLevel - depthLevel == 2)) {
			this.viewedThreePlus = this.viewedThreePlus + delta;
			str = str + "\tTime Delta Viewed Thrice+: " + prntF(delta);
		} 

		// Print it out!
		this.logger.log (str);

		// Save our last state 
		prevDepthLevel = depthLevel;
		tPrev = i.timePoint;

		// Traverse to the next node
		i = i.nextNode;
	}



	var duration = this.stats.videop.player.duration;

	this.logger.log ("Statistics: Cumulative Totals: ");
	this.logger.log ("Statistics: Video Viewed Exactly Once: " + prntF(this.viewedOnce) + "(s). " +
		prntP(this.viewedOnce / duration));
	this.logger.log ("Statistics: Video Viewed Exactly Twice: " + prntF(this.viewedTwice) + "(s). " +
		prntP(this.viewedTwice / duration));
	this.logger.log ("Statistics: Video Viewed at Least Three Times or More: " + 
		prntF(this.viewedThreePlus)+ "(s). " + prntP(this.viewedThreePlus / duration));

	this.logger.log("Statistics: Duration of the video is " + prntF(duration) + " seconds");


	this.logger.log ("Statistics: -------------------");

};


function TallyNodeFactory(logger) {

	// One place to store the logger for each nodes
	this.logger = logger;

	// This will be the ID counter fo all nodes created by this factory instance
	this.idCounter = 0;

}

TallyNodeFactory.prototype.create = function(timePoint, type) {

	// Build a new node, return it
	return new TallyNode(timePoint, type, this);

};


function TallyNode(timePoint, type, factory) {

	this.factory = factory;

	// Have an ID for each node in the linked list, for debugging!
	this.ID = ++this.factory.idCounter; 

	// Store data
	this.timePoint = timePoint;
	this.type = type;
	this.nextNode = null;
	this.prevNode = null;

	// Debug
	this.factory.logger.log ("TallyNode: Created node ID=" + this.ID + " with timePoint=" + 
		this.timePoint + " " + this.type.name);
};

TallyNode.prototype.toString = function(header) {

	return "Statistics: [Node ID=" + prntI(this.ID) + "] "  + " Time(s): " + prntF(this.timePoint) + 
		"\tAction: " + this.type.name;
};

