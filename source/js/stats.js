"use strict";
/*

 The file stats.js contains the main and auxiliary objects that keep track of the time
 viewed statistics.

 The Stats object is the main object, where the rest of its auxiliary classes 'hang.
 Stats keeps a table of all segments viewed, in this.table(). Whenever there is a 
 change of STATE (i.e. when the user pauses or starts the video) the function
 logInterval() makes a new entry, or updates an existing entry. The Entry class
 takes care of specifying each entry, storing its internal states (completed, in-progress
 for entries that have a START but not a STOP time, for example) and updating them
 via update() with time stamps based on the video when it is time to update() them.

 The Tally via its add() method takes this table and 'flattens' it out, and interleaves all
 segments that overlap (or not), and then uses its method traverse() to derive all
 time statistics (video times for viewed once, twice, etc). The Tally object uses
 a doubly-linked list, and makes sure via its own comparison routine isBigger that
 each START is always followed by its OWN event even though they can occur with the
 same video signature (as it happens when the user starts and stops the video). The
 Tally object's linked list has as its entries instances of TallyNode. Just as with 
 the Entry class, TallyNode has the required methods to print header and contents
 upon request.
 
 Because normally it would be impossible to determine if the user exceeded a view
 threshold, of say 25% of a given video seen twice, till the user PAUSED the video,
 a timer, enclosed in its class Timer, fires the peekStats() callback of Stats
 every five seconds. peekStats() copies the Entries table to a temporary table
 and executes a temporary Tally() --simulating the user pausing the video. By doing
 this we can derive the stats as they exist right now and do not need to wait till
 the user pauses.

 For efficiency, the timer is stopped when the user has stopped the video. The additions
 to Entry and to Tally are all linear O(n), and done without recursion, where n is the
 number of time segments created by the user by starting or stopping the video.

/*
	How stats are stored and calculated

	Segments seen are stored in this.table. Entry() entries in the table are created by
	EntryFactory() so that they can have an ID stored in the factory's closure.	Each
	Entry() instance has its start and stop times, if any, and contains its state, which
	can be one of IN_PROGRESS (the user has not completed the segment by pressing pause),
	COMPLETED (the user has finished the segment by pressing pause, tracking somewhere
	else, or the video has finished, etc.) In addition, once entries can be processed by
	Tally(), they are marked as START_AGGREGATED as Tally()'s add() method is processing
	their start times and marked as FULLY_AGGREGATED when Tally()'s add method has finished
	processig them.

	Tally()'s add() method creates a doubly-linked list to interleave the segments above,
	to determine what portion of the video has been seen exactly x times, from any times
	t1 and t2, ... tn. Each entry in Tally()'s list is labeled as START to indicate that
	it's time mark indicates a segment started, and STOP to indicate that the video seg-
	ment ended. The head and tail of the linked list, which is ordered is bookcased by
	nodes marked DUMMY. Tally()'s isBigger() function knows that when two segments share
	the exact START and STOP times, START preceeds STOP. This case occurs when the user
	pauses and then re-starts the video.

	The final stats are computed everytime in response to the user pausing the video, or
	having the video end. However, so that it is possible to determine what the user has
	seen before play stops, Stats has its peekStat() function, that computes subtotals
	via a 5 second timer by simulating the user pausing the video at this time. To do this
	non-destructively, the table and linked list mentioned above are copied.

	The following is an example of the output, right now being sent to the console via the
	logger, at level MEDIUM:


	Seg#	Type:				VideoStart(s)		VideoStop(s)	Delta(s)
	1		FULLY__AGGREGATED		0000.0000			0008.4472		0008.4472
	2		FULLY__AGGREGATED		0008.4472			0012.5569		0004.1098
	3		FULLY__AGGREGATED		0067.3048			0069.7150		0002.4102
	4		FULLY__AGGREGATED		0067.5496			0071.8173		0004.2677
	5		FULLY__AGGREGATED		0069.5075			0074.2861		0004.7786
	6		ENTRY_IN_PROGRESS		0070.2418			[TBD]		[TBD]

	peekStat()'s would compute this state as:

	ASSUMING a PAUSE from the USER, the temporary table statistics would be as follows: 

	Type:				VideoStart(s)		VideoStop(s)	Delta(s)
	FULLY__AGGREGATED		0000.0000			0008.4472		0008.4472
	FULLY__AGGREGATED		0008.4472			0012.5569		0004.1098
	FULLY__AGGREGATED		0067.3048			0069.7150		0002.4102
	FULLY__AGGREGATED		0067.5496			0071.8173		0004.2677
	FULLY__AGGREGATED		0069.5075			0074.2861		0004.7786
	FULLY__AGGREGATED		0070.2418			0075.1596		0004.9179


	These times, once interleaved, form the following time line echoed by traverse() 

	[Node ID=003]  Time(s): 0000.0000	Action: START
	[Node ID=004]  Time(s): 0008.4472	Action: STOP	Time Delta Viewed Once:    0008.4472
	[Node ID=005]  Time(s): 0008.4472	Action: START
	[Node ID=006]  Time(s): 0012.5569	Action: STOP	Time Delta Viewed Once:    0004.1098
	[Node ID=007]  Time(s): 0067.3048	Action: START
	[Node ID=009]  Time(s): 0067.5496	Action: START	Time Delta Viewed Once:    0000.2447
	[Node ID=011]  Time(s): 0069.5075	Action: START	Time Delta Viewed Twice:   0001.9580
	[Node ID=008]  Time(s): 0069.7150	Action: STOP	Time Delta Viewed Thrice+: 0000.2075
	[Node ID=013]  Time(s): 0070.2418	Action: START	Time Delta Viewed Twice:   0000.5267
	[Node ID=010]  Time(s): 0071.8173	Action: STOP	Time Delta Viewed Thrice+: 0001.5755
	[Node ID=012]  Time(s): 0074.2861	Action: STOP	Time Delta Viewed Twice:   0002.4688
	[Node ID=014]  Time(s): 0075.1596	Action: STOP	Time Delta Viewed Once:    0000.8735

	The entries above can be summarized in different ways, for example:

	Statistics: Cumulative Totals: 
	Video Viewed Exactly Once: 0013.6752(s). 12.84%
	Video Viewed Exactly Twice: 0004.9535(s). 4.65%
	Video Viewed One Time or More: 0020.4117(s). 19.17%
	Video Viewed Two Times or More: 0006.7365(s). 6.33%
	Video Viewed Three Times or More: 0001.7831(s). 1.67%
	Duration of the video is 0106.4640 seconds ['duration' as reported by the html object]

	Note: Non-cummulative totals for viewed two times are yet to added :(

	Traverse() moves from first to last, chronologically, determining the depth of viewing,
	with START increasing the depth, and STOP decreasing it. The transitions of depth
	determine what kind of event ocurred. These transitions are directional, for example
	a change from 0 to 1, indicates a start of an exactly once viewed segment and no past
	delta, but a transition from 1 to 0, indicates the end of an once-viewed segment with
	a non-zero delta.

Compute logic, state transitions, and complexity:

	Stats() calls its logInterval() function whenever a play or stop event is received,
	as relayed by Videop(). logInterval can be in one of the following states and transitions:

	Case 1: First thing the user did was move the playhead via
	click or grab, we are transitioning from INIT_STATE to PLAY_STOPS
	No video has been seen, which means we make note of the transition and exit.
	logEntry()'s state transition: INIT_STATE -> PLAY_STOPS
	No entry created.

	Complexity:
		We look for a function f(n) that for any n, where n is any number 
		of existing segments (including zero), is an upper-bound of our computational cost.
		f(n) = f(0) with n=0
		f(0) = baseline computing cost not depending on number of entries
		f(0) = k, where k is that cost, which we assume con
		O(f(0)) = O(k) = k * O(1) = O(1)


	Case 2: The user was in pause mode, and moved the playhead
	and remains in pause mode. No video has been seen
	logEntry()'s state transition: PLAY_STOPS -> PLAY_STOPS
	No entry created.

	Complexity
		For this second case, the complexity is also O(1), the cost is constant
		independent of previous number of entries as no entries are inserted.


	Case 3: We were paused or in init state, but now playback has started
	logEntry()'s state transition: INIT_STATE or PLAY_STOPS ->PLAY_BEGINS) 
	Entry state transition [New] -> IN_PROGRESS w/videoStart time


	Complexity:
		For n existing entries we find that, for the new entry n + 1
		we are looking for an upperbound f(n + 1) = f1(n + 1) + f2(n + 1)
		where f2() is the upperbound of cost of creating a new entry &
		where f1() is the upperbound of appending at the end of our table array,
		which is naturally sorted. Yet none of these activites are algorithmically dependent
		on the number of existing entries, and none are visited as no tallies 
		occur. Hence both f1() and f2() are more or less constant, independent
		of the current number of entries (as long as the arrays do not need to 
		be moved around in memory). Then we see that if we assume f1() and f2()
		to be constant, we have O(1). Even if ECMAScript moves the arrays everytime
		we make an insertion, this would have a cost of O(n) in the worst case.


	Case 4: We were playing, now we are paused.
	logEntry()'s state transition: PLAY_BEGINS -> PLAY_STOPS
	Entry state transtion IN_PROGRESS -> COMPLETED w/videoStop time

	Complexity
		Updating the current nth entry with its STOP state results in constant
		costs for switching state, updating the entry, creating a new entry
		node for Tally(), and stopping the timer that computes interim results. 

		However, the add() function of Tally() does have to visit previous nodes
		to insert the finished entry in the doubly-linked list. Insertion and
		deletion does not require moving any of the elements, nor reshuffling an
		array. Yet the insertion point for the start time of this segment has to
		be found, and so it is for the end point of this segment. Assuming a worst
		case, we would always be inserting a very short segment, with start and
		stop points at the end. Hence the entire linked list would be traversed.
		Thus a function that grows by the constant k cost of visiting each element
		exists, f1(n) = nk, or O(f1(n)) = O(nk) = O(n).
	
		Because we generate subtotals everytime we complete a segment, we do a
		traverse() on the Tally() linked list, from start to stop time, as we 
		calculate numbers. As we never go back, nor need to revisit any nodes, this
		can be bound with a function f2() so that f2(n) = nq, where q is 
		traverse()'s fixed cost of visiting each node, so  O(f2(nq)) = O(nk) = O(n).

		The cost of add() and traverse() is both O(n) for each, but O(n) + O(n)
		can still be bounded by a different upperbound, still O(n). The complexity
		thus remains O(n). 

		Similarly, painting the playbar and moving it, is also algorithmically linear,
		in theory growing in linear fashion to the size of the video, the time watched, 
		or the segments created.

		Hence algorithmically, this code should be O(n). This, however, does not
		mean that the computing experience scales smoothly. At some point, with videos
		large enough, and with computers busy enough and hardpressed with low memory
		and demanding framerates in multiple videos and tasks, the system can tip to 
		actual performance that might be insufficient to the users --though not 
		'necessarily' related to the algorithms in this program.


	How stats are stored and calculated

	Segments seen are stored in this.table. Entry() entries in the table are created by
	EntryFactory() so that they can have an ID stored in the factory's closure.	Each
	Entry() instance has its start and stop times, if any, and contains its state, which
	can be one of IN_PROGRESS (the user has not completed the segment by pressing pause),
	COMPLETED (the user has finished the segment by pressing pause, tracking somewhere
	else, or the video has finished, etc.) In addition, once entries can be processed by
	Tally(), they are marked as START_AGGREGATED as Tally()'s add() method is processing
	their start times and marked as FULLY_AGGREGATED when Tally()'s add method has finished
	processig them.

	Tally()'s add() method creates a doubly-linked list to interleave the segments above,
	to determine what portion of the video has been seen exactly x times, from any times
	t1 and t2, ... tn. Each entry in Tally()'s list is labeled as START to indicate that
	it's time mark indicates a segment started, and STOP to indicate that the video seg-
	ment ended. The head and tail of the linked list, which is ordered is bookcased by
	nodes marked DUMMY. Tally()'s isBigger() function knows that when two segments share
	the exact START and STOP times, START preceeds STOP. This case occurs when the user
	pauses and then re-starts the video.

	The final stats are computed everytime in response to the user pausing the video, or
	having the video end. However, so that it is possible to determine what the user has
	seen before play stops, Stats has its peekStat() function, that computes subtotals
	via a 5 second timer by simulating the user pausing the video at this time. To do this
	non-destructively, the table and linked list mentioned above are copied.

	The following is an example of the output, right now being sent to the console via the
	logger, at level MEDIUM:


	Seg#	Type:				VideoStart(s)		VideoStop(s)	Delta(s)
	1		FULLY__AGGREGATED		0000.0000			0008.4472		0008.4472
	2		FULLY__AGGREGATED		0008.4472			0012.5569		0004.1098
	3		FULLY__AGGREGATED		0067.3048			0069.7150		0002.4102
	4		FULLY__AGGREGATED		0067.5496			0071.8173		0004.2677
	5		FULLY__AGGREGATED		0069.5075			0074.2861		0004.7786
	6		ENTRY_IN_PROGRESS		0070.2418			[TBD]		[TBD]

	peekStat()'s would compute this state as:

	ASSUMING a PAUSE from the USER, the temporary table statistics would be as follows: 

	Type:				VideoStart(s)		VideoStop(s)	Delta(s)
	FULLY__AGGREGATED		0000.0000			0008.4472		0008.4472
	FULLY__AGGREGATED		0008.4472			0012.5569		0004.1098
	FULLY__AGGREGATED		0067.3048			0069.7150		0002.4102
	FULLY__AGGREGATED		0067.5496			0071.8173		0004.2677
	FULLY__AGGREGATED		0069.5075			0074.2861		0004.7786
	FULLY__AGGREGATED		0070.2418			0075.1596		0004.9179


	These times, once interleaved, form the following time line echoed by traverse() 

	[Node ID=003]  Time(s): 0000.0000	Action: START
	[Node ID=004]  Time(s): 0008.4472	Action: STOP	Time Delta Viewed Once:    0008.4472
	[Node ID=005]  Time(s): 0008.4472	Action: START
	[Node ID=006]  Time(s): 0012.5569	Action: STOP	Time Delta Viewed Once:    0004.1098
	[Node ID=007]  Time(s): 0067.3048	Action: START
	[Node ID=009]  Time(s): 0067.5496	Action: START	Time Delta Viewed Once:    0000.2447
	[Node ID=011]  Time(s): 0069.5075	Action: START	Time Delta Viewed Twice:   0001.9580
	[Node ID=008]  Time(s): 0069.7150	Action: STOP	Time Delta Viewed Thrice+: 0000.2075
	[Node ID=013]  Time(s): 0070.2418	Action: START	Time Delta Viewed Twice:   0000.5267
	[Node ID=010]  Time(s): 0071.8173	Action: STOP	Time Delta Viewed Thrice+: 0001.5755
	[Node ID=012]  Time(s): 0074.2861	Action: STOP	Time Delta Viewed Twice:   0002.4688
	[Node ID=014]  Time(s): 0075.1596	Action: STOP	Time Delta Viewed Once:    0000.8735

	The entries above can be summarized in different ways, for example:

	Statistics: Cumulative Totals: 
	Video Viewed Exactly Once: 0013.6752(s). 12.84%
	Video Viewed Exactly Twice: 0004.9535(s). 4.65%
	Video Viewed One Time or More: 0020.4117(s). 19.17%
	Video Viewed Two Times or More: 0006.7365(s). 6.33%
	Video Viewed Three Times or More: 0001.7831(s). 1.67%
	Duration of the video is 0106.4640 seconds ['duration' as reported by the html object]

	Note: Non-cummulative totals for viewed two times are yet to added :(

	raverse() moves from first to last, chronologically, determining the depth of viewing,
	with START increasing the depth, and STOP decreasing it. The transitions of depth
	determine what kind of event ocurred. These transitions are directional, for example
	a change from 0 to 1, indicates a start of an exactly once viewed segment and no past
	delta, but a transition from 1 to 0, indicates the end of an once-viewed segment with
	a non-zero delta.

*/


function Stats(videop, logger) {

	this.logger = logger;
	this.videop = videop;
	this.logger.assert(this.videop instanceof Videop, "Stats: Missing videop!");
	this.pastAction = this.actionEnum.INIT_STATE;

	// A factory to create entries on the fly
	this.entryFactory = new EntryFactory (this, videop, logger);

	// Each viewed interval will be stored here...
	this.table = [];
	this.tableCopy = null; // A copy for asynchronous peeking of stats

	// A tally of times viewed, re-viewed is kept here...
	this.tally = new Tally(this, this.logger);
	this.tempTally = null; // A copy for asynchronous peeking of stats

	this.logger.log("Stats constructor called! Creating stats update timer. Starts off");
	this.peekTimer = new Timer(5000, this.peekStats.bind(this), this.logger);

}
// The purpose of peek Stats is to check often to detect when 25% view has been reached
// even if the user is playing the video. 
Stats.prototype.peekStats = function () {

	// Traverse AND compute temporary stats
	this.logger.log ("Statistics: PEEKing into stats via timer", this.logger.levelsEnum.MEDIUM);
	
	// Sanity check...
	if (this.table == null) {
		this.logger.log ("Stats, peekStats. null table. Nothing to peek into. Returning!");
		return;
	}

	// On the fly, get each entry in our table of intervals, copy, and create a new tally
	this.tableCopy = [];
	this.tempTally = new Tally(this, this.logger);

	this.table.forEach(function(e, i, a) {
		var entryCopy = e.copy();
		this.logger.log ("Stats, copyTable: Inserting copyied entry " + e.ID);
		if (entryCopy.curType == entryCopy.entryEnum.FULLY_AGGREGATED) {
			entryCopy.curType = entryCopy.entryEnum.COMPLETED;
			this.tableCopy.push(entryCopy);
		}
		if (entryCopy.curType == entryCopy.entryEnum.IN_PROGRESS) {
			entryCopy.update(entryCopy.entryEnum.COMPLETED); // <<<< SIMULATES a PAUSE
			this.tableCopy.push(entryCopy);
		}
		this.tempTally.add(entryCopy);
	}, this);

	// Now print results
	this.logger.log ("Statistics: Current statistics:", this.logger.levelsEnum.MEDIUM);
	this.printTable(this.table);

	this.logger.log ("Statistics: ASSUMING a PAUSE from the USER, statistics would be as follows:",
		this.logger.levelsEnum.MEDIUM);
	this.printTable(this.tableCopy);
	this.tempTally.traverse();

};


Stats.prototype.startPeeking = function () {
	this.logger.log("Stats! Starting peek timer as play is in progress.");
	this.peekTimer.start();
};

Stats.prototype.stopPeeking = function () {
	this.logger.log("Stats! Stopping peek timer as video is paused.");
	this.peekTimer.stop();
};


Stats.prototype.printTable = function (table) {

//	this.logger.log ("----------------" , this.logger.levelsEnum.MEDIUM);
	this.logger.log ((new Entry).getHeader("Statistics"), this.logger.levelsEnum.MEDIUM);
	table.forEach(function(e,i,a){
		this.logger.log(e.toString("Statistics"), this.logger.levelsEnum.MEDIUM);
	}, this);
};


Stats.prototype.actionEnum = Object.freeze(
								{
									INIT_STATE : {name: "INIT_STATE"},
									PLAY_BEGINS : {name: "PLAY_BEGINS"},
									PLAY_STOPS : {name: "PLAY_STOPS"}
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
		this.printTable(this.table);
		this.tally.traverse();

		// The state is now changed to stopped
		this.pastAction = this.actionEnum.PLAY_STOPS;

		return;
	}

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
}
Entry.prototype.copy = function () {

	var theCopy = new Entry(this.stats, "Copy of " & this.ID, this.videoStart, this.logger);
	theCopy.curType = this.curType;
	theCopy.delta = this.delta;
	theCopy.videoStart = this.videoStart;
	theCopy.videoStop = this.videoStop;
	return theCopy;

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

	this.logger.log(this.getHeader("Entry, Update"));
	this.logger.log(this.toString("Entry, Update"));
	return this;

};

Entry.prototype.getHeader = function (header) {

	return header + ": Seg#\tType:\t\t\t\tVideoStart(s)\t\tVideoStop(s)\tDelta(s)";
};


Entry.prototype.toString = function (header) {

	return (header +": " + this.ID + "\t\t" +
		this.curType.name + "\t\t" +
		prntF(this.videoStart) + "\t\t\t" +
		(this.videoStop == -1 ? "[TBD]" : prntF(this.videoStop)) + "\t\t" +
	    (this.delta == -1 ? "[TBD]" : prntF(this.delta)));
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

	// An init linked list that holds segments watched. this.list is a member var holding the list.
	var dummyStart = this.nodeFactory.create(Number.MAX_VALUE * -1, this.nodeEnum.DUMMY);
	var dummyStop = this.nodeFactory.create(Number.MAX_VALUE, this.nodeEnum.DUMMY);
	dummyStart.nextNode = dummyStop;
	dummyStop.prevNode = dummyStart;
	this.list = dummyStart;

}
// Add a time interval to the total time we have watched, re-watched, etc.
Tally.prototype.add = function(entry, copyMode) {

	this.logger.log ("Tally, add: called for entry " + entry.toString("Tally") + " copyMode:" + copyMode);

	// Sanity Check! If we are working on real live data, all nodes must be COMPLETED.
	// If we are copying, and working on old data, all nodes must be FULLY_AGGREGATED
	if (typeof copyMode == 'undefined' || copyMode == false) {
		this.logger.assert(entry.curType == entry.entryEnum.COMPLETED, 
			"Tally: Not COMPLETED entry passed to Tally.add(). copyMode=" + copyMode)
	} else {
		// force is true
		this.logger.assert(entry.curType == entry.entryEnum.FULLY_AGGREGATED, 
			"Tally: Not FULLY_AGGREGATED entry passed to Tally.add(). copyMode=" + copyMode)	
	}

	// Add into our internal customized linked list holding all segments

	var i = this.list;
	var inserted = false;
	// We begin traversing at the first node
	// while there are nodes in the list
	// Insert the start time
	while (i != null && inserted == false) {
		// If we have not added this entry's videoStart...
		if (entry.curType == entry.entryEnum.COMPLETED 
			&& this.isSmaller(entry.videoStart, i.timePoint, entry.curType)) {

			this.insertBeforeIth(i, entry.videoStart, this.nodeEnum.START);

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
			&& this.isSmaller(entry.videoStop, i.timePoint, entry.curType)) {

			this.insertBeforeIth(i, entry.videoStop, this.nodeEnum.STOP);

			// Make note we added this videoStop
			entry.curType = entry.entryEnum.FULLY_AGGREGATED;

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

};

Tally.prototype.insertBeforeIth = function(i, time, type) {

	// Build a new node
	var newNode = this.nodeFactory.create(time, type);
			
	// Attach before the ith node
	newNode.nextNode = i.prevNode.nextNode;	

	// Place after of the prev node
	i.prevNode.nextNode = newNode;
	newNode.prevNode = i.prevNode;
	i.prevNode = newNode;
};


Tally.prototype.traverse = function () {

	var depthLevel = 0;
	var prevDepthLevel = 0;
	var tPrev = 0;
	var delta = 0;
	this.viewedOnce = 0;
	this.viewedTwice = 0;
	this.viewedThreePlus = 0;


	this.logger.log ("Statistics: -------------------", this.logger.levelsEnum.MEDIUM);

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

		// Calculate the time difference to assing
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
			|| prevDepthLevel >= 3 && (prevDepthLevel - depthLevel == -1)) {
			this.viewedThreePlus = this.viewedThreePlus + delta;
			str = str + "\tTime Delta Viewed Thrice+: " + prntF(delta);
		} 

		// Print it out!
		this.logger.log (str, this.logger.levelsEnum.MEDIUM);

		// Save our last state 
		prevDepthLevel = depthLevel;
		tPrev = i.timePoint;

		// Traverse to the next node
		i = i.nextNode;
	}



	var duration = this.stats.videop.player.duration;

	this.logger.log ("Statistics: Cumulative Totals: ", this.logger.levelsEnum.MEDIUM);
	this.logger.log ("Statistics: Video Viewed Exactly Once: " + prntF(this.viewedOnce) + "(s). " +
		prntP(this.viewedOnce / duration), this.logger.levelsEnum.MEDIUM);
	this.logger.log ("Statistics: Video Viewed Exactly Twice: " + prntF(this.viewedTwice) + "(s). " +
		prntP(this.viewedTwice / duration), this.logger.levelsEnum.MEDIUM);

	var oneTimeOrMore = this.viewedOnce + this.viewedTwice + this.viewedThreePlus;
	this.logger.log ("Statistics: Video Viewed One Time or More: " + prntF(oneTimeOrMore) + "(s). " +
		prntP(oneTimeOrMore / duration), this.logger.levelsEnum.MEDIUM);
	
	var twoTimesOrMore = this.viewedTwice + this.viewedThreePlus;
	this.logger.log ("Statistics: Video Viewed Two Times or More: " + prntF(twoTimesOrMore) + "(s). " +
		prntP(twoTimesOrMore / duration), this.logger.levelsEnum.MEDIUM);

	this.logger.log ("Statistics: Video Viewed Three Times or More: " + 
		prntF(this.viewedThreePlus)+ "(s). " + prntP(this.viewedThreePlus / duration),
		this.logger.levelsEnum.MEDIUM);

	this.logger.log("Statistics: Duration of the video is " + prntF(duration) + " seconds",
		this.logger.levelsEnum.MEDIUM);

	this.logger.log ("Statistics: -------------------", this.logger.levelsEnum.MEDIUM);

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
}
TallyNode.prototype.toString = function() {

	return "Statistics: [Node ID=" + prntI(this.ID) + "] "  + " Time(s): " + prntF(this.timePoint) + 
		"\tAction: " + this.type.name;
};