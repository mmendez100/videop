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
};

Stats.prototype.actionEnum = Object.freeze(
								{
									INIT_STATE : {name: "INIT_STATE"},
									PLAY_BEGINS : {name: "PLAY_BEGINS"},
									PLAY_STOPS : {name: "PLAY_STOPS"},
									PLAY_PLAY : {name: "PLAY_PLAY"}
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
		var newEntry = this.entryFactory.buildEntry();
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
		oldEntry.update(oldEntry.entryEnum.COMPLETED);

		// Add it back to the table
		this.table.push(oldEntry);

		// Add it to our total tally
		this.tally.add(oldEntry);
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
EntryFactory.prototype.buildEntry = function ()
{

	// ...but also get the 1 second less accurate currentTime, just to have it
	var videoStart = this.videop.player.currentTime;

	// Finally, build the entry!
	var entry = new Entry(this.stats, this.entryID++, videoStart, this.logger);

	this.logger.log(entry.getHeader());
	this.logger.log(entry.toString());
	return entry;
};

Entry.prototype.entryEnum = Object.freeze(
								{
									IN_PROGRESS : {name: "IN_PROGRESS"}, 
									COMPLETED : {name: "COMPLETED"},
									START_AGGREGATED : {name: "START_AGGREGATED"},
									FULLY_AGGREGATED : {name: "FULLY_AGGREGATED"}
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

	this.logger.log(this.getHeader(), this.logger.levelsEnum.WARN);
	this.logger.log(this.toString(), this.logger.levelsEnum.WARN);
	return this;

};

Entry.prototype.getHeader = function () {

	return "logInterval: Seg#\tType:\t\tVideoStart(s)\tVideoStop(s)\tDelta(s)";
};


Entry.prototype.toString = function () {

	var str = "logInterval: " + this.ID + "\t\t" +
		this.curType.name + "\t" +
		this.videoStart.toPrecision(6) + "\t\t\t" +
		(this.videoStop == -1 ? "[TBD]" : this.videoStop.toPrecision(6)) + "\t\t" +
	    (this.delta == -1 ? "[TBD]" : this.delta.toPrecision(6));

	return str;
};


Tally.prototype.nodeEnum = Object.freeze(
								{
									START : {name: "START"}, 
									STOP : {name: "STOP"},
									DUMMY : {name: "DUMMY"}
								});


// Constructor
function Tally (stats, logger) {

	// Member variables & some sanity checks
	this.logger = logger;
	this.stats = stats;
	this.logger.assert(this.stats instanceof Stats, "Tally: Missing stats object!");

	// A node factory
	this.nodeFactory = new TallyNodeFactory(this.logger);
	this.viewedOnce = -1;
	this.viewedTwice = -1;
	this.viewedThreePlus = -1;
	this.duration = this.stats.videop.player.duration;

	this.logger.log("Tally: Duration of the video is " + this.duration);

	// An init linked list that holds segments watched
	var dummyStart = this.nodeFactory.create(Number.MAX_VALUE * -1, this.nodeEnum.DUMMY);
	var dummyStop = this.nodeFactory.create(Number.MAX_VALUE, this.nodeEnum.DUMMY);
	dummyStart.nextNode = dummyStop;
	dummyStop.prevNode = dummyStart;
	this.list = dummyStart;

};

// Add a time interval to the total time we have watched, re-watched, etc.
Tally.prototype.add = function(entry) {

	// Make sure we do not add entries twice!
	this.logger.assert(entry.curType == entry.entryEnum.COMPLETED, "Tally: Not completed entry passed to Tally.add()!")

	// Add into our internal customized linked list holding all segments
	var newNode = null;
	var i = this.list;
	var inserted = false;
	// We begin traversing at the first node
	// while there are nodes in the list
	// Insert the start time
	while (i != null && inserted == false) {
		// If we have not added this entry's videoStart...
		if (entry.curType == entry.entryEnum.COMPLETED 
			&& entry.videoStart <= i.timePoint) {

			// Build a new node
			newNode = this.nodeFactory.create(entry.videoStart, this.nodeEnum.START);
			
			// Attach behind the ith node
			newNode.nextNode = i.prevNode.nextNode;	

			// Place ahead of the prev node
			i.prevNode.nextNode = newNode;
			newNode.prevNode = i.prevNode;
			i.prevNode = newNode;

			// Make note we added this videoStart for this entry (for debugging)
			entry.curType = entry.entryEnum.START_AGGREGATED;

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
		if (entry.curType == entry.entryEnum.START_AGGREGATED
			&& entry.videoStop <= i.timePoint) {
			// Build a new node
			newNode = this.nodeFactory.create(entry.videoStop, this.nodeEnum.STOP);
			
			// Attach in front of ith node
			newNode.nextNode = i.prevNode.nextNode;	

			// Place ahead of the prev node
			i.prevNode.nextNode = newNode;
			newNode.prevNode = i.prevNode;
			i.prevNode = newNode;

			// Make note we added this videoStop for this entry (for debugging)
			entry.curType = entry.entryEnum.FULLY_AGGREGATED;

			// break loop
			inserted = true;
		}
	// Otherwise go on to the next node, see if it goes there
	i = i.nextNode;
	}

};


Tally.prototype.traverse = function () {

	var depthLevel = 0;
	this.logger.log ("Tally: -------------------");

	// Visit all nodes and print them out
	var i = this.list;
	while (i != null) {
		var str = i.toString();
		if (i.type == this.nodeEnum.START) depthLevel++;
		if (i.type == this.nodeEnum.STOP) depthLevel--;
		this.logger.log (str + "\tViews: " + depthLevel);
		i = i.nextNode;
	}
	this.logger.log ("Tally: -------------------");
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

TallyNode.prototype.toString = function() {

	return "Tally: [Node ID=" + this.ID + "] "  + " Time(s): " + this.timePoint.toPrecision(5) + "\tAction: " + this.type.name;
};

