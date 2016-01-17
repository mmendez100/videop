# videop, 

Version: 0.0.9
Summary:

Videop() is a JavaScript video player control built using only JavaScript/ECMAScript, with a playbar, 
video playback head, tracking, grabbing, and seeking via clicking on the playbar or grabbing 
the playhead with the mouse.

Start and stop times of segments viewed are stored as the video is paused or stopped.
Then total times viewed once, twice, etc. are calculated and passed to a Logger() class, 
which in this version writes to the console. Aggregate times are calculated whenever the 
user pauses the video --or every five seconds during play time.

Videop(), is intended to be attached in JavaScript to an hmtl5 video object and is a 'class' object
implemented via closure for storage in function Videop(), and with member functions added to
Videop()'s prototype'.


Current Testing State:

Videop() has been tested in Chrome, Version 47.0.2526.111 (64-bit), under MacOS v. 10.10.5.
Minimal testing shows that it also works in Opera, Version 34.0.2036.25 also under MacOS 10.10.5.
The control works in Firefox 43.0.4 "Funnelcake" but only after Firefox is *manually* resized.
Otherwise the playbar paints quite below the video control, under Mac.


Files comprising this control:

    The control itself:
    videop.js:  the main control and container class, along with all UI drawing/painting code.
    stats.js:   code for time accounting and reporting.
    tracker.js: code in turn calling code in videop.js to sync the video head's 
                position as the video plays.

    Auxiliary classes & code:
    timer.js:   a class to encapsulate JavaScript timers in an OOP fashion.
    logger.js:  a code centralizing console writting and implementing several logging levels.
    utils.js:   simple functions used to print floats with formatting.

    Example code:
    video.html: a simple html page where the html5 video control is defined.
    videop,css: CSS class definitions used by Videop().
    SavageGetLoose.png: a poster to present when the video specified by video.html is not playing
    main.js:     example JavaScript where Videop() is attached to the html5 control 
                included in video.html.

Overall Architecture:

    Videop() analyzes the size of the html5 video element, and creates the objects to paint and 
    attend to the playbar. The playbar object in turns contains the playhead object, that draws 
    the playhead and current video time and erases both when movement or resizing occurs

    Videop also captures events from the video element via callbacks, in turn calling Playbar() 
    and PlayHead() handle all painting based on video and mouse events, including grabbing and 
    "bolding" the playhead whenit is "grabbable," and responding to resize events.

    Stats() implicitly contains a state machine and stores segments viewed, and interleaves them 
    into a doubly-linked list to calculate statistics. Complexity is O(n) where n is the number of 
    existing segments.(See detailed discussion below, for the complexity analysis and even more 
    descriptions in stat.js). Stats() fires a five second timer to create on-the-fly updated 
    statistics when playing is progressing, but also updates all statistics when the user stops 
    the video or playing ends.

    Tracker() captures via a timer.js class the position of the video every 100 mS and tells 
    the Playbar to update to the right place in the playbar relative to its current dimensions 
    and the total time of the video.

    The timers are all stopped when the video is not playing.


Coding Style

    The project uses an Object Oriented approach where a "constructor" is implemented as a function
    that holds all storage/member variables inside its closure. Member functions are implemented
    as functions injected into the constructor's prototype, following the style of Zaka's 
    "The Principles of Object-Oriented JavaScript." Neverthess, this is not taken to an extreme, and
    getters and setters are not explicitly declared, nor underscores (as in _fakePrivateMemberVariable) 
    are used. The disadvantage of this approach is the use of many, many redundant "this.xxxx" 
    statements to refer to member variables or functions. The advantage is that there is exactly 
    one copy of each member function machine code even when many instances of the class exist.

    I am aiming for clarity and ease of expansion, hence the code tends to be a bit verbose, but
    debugging advantages do exist. Following C99 style recommendations, logical
    comparisons are written for clarity often as "if (state_x == true && stateY == false)..." versus 
    "if (state_x && !state_y)..." The logger class is used to implement different levels of verbosity 
    and changing the logger can help debugging and events be easily directed to a file or a 
    data sync. Using filters in the debugging console to select 'tags' also is useful. For example, 
    with full VERBOSE mode, changed in Videop(), when using the filter "Stat" many more messages 
    regarding statistic calculations can be seen.

    Note: Coding style, when working on a team, though, is always optimal to what the team uses. 
    No coding style is "absolutely" better.


Alternatives Considered

    Creating stats via state as done here is an "analytical" approach. However, creating analogues
    is also an option. An idea that came to mind was to paint in a hidden canvas the video viewed
    as horizontal lines and stack these lines on top of each other as the user viewed "areas"
    of video. However, to obtain granularity, the Canvas/DIV could grow too large (over 36000 pixels
    for just one a hour interval at a mediocre 0.1 s resolution). Moreover, obtaining cumulative
    results would mean examining each of the pixels in this DIV, and even with only 10 segments, 
    this could take a very long time as over 360,000 pixels would have to be iterated over or some 
    sort of bucket mechanism would be used.

    The math around overlapping segments is reminiscent of bit-wise OR operations and I considered 
    implementing the tracking as writting 1s in a block of bits, and ORing those bits with new
    segments. The problem in JavaScript is that bit operations are run over 32bit fields, and that
    these would have to also be looped over and over. As in using a visual Canvas/DIV as an analogue, 
    the basic problem is that we are basically measuring time, and that any analogue is challenged
    by the infinite indivisibility of time.

    Another alternative that I did not explore is to consider this a set theory problem with its own
    set operators, where each set is an interval. In this case, if nodes defining a set, and math on
    these nodes can be deviced, this becomes a problem of the union of an old set representing all
    past intervals and the union of a new set. [Analytically, I am implicitly doing this over 
    a numberline].


Lessons Learned & Challenges

    This has been a fun project that has been great to sharpen my JavaScript, and a return to
    some of the days where I coded UI components in MFC and Motif. I am sure code review of this
    code can even further improve my approaches and strengthen my ECMAScript. Obviously a control
    like this for any browser, or for pre-html5 modes, would be a very, very serious challenge.

    Some interesting aspects concern the use of rounding pixels when painting. I found that
    rounding makes the playbar movement a bit jerky, but that not rounding can leave trails
    of unerased stuff (the code does not refresh the canvas to delete, it "unpaints" instead).

    I also saw how there are some subsecond time lags between the html5 video currentTime values, 
    and the actual video being displayed --which is probably also a matter of starting and stopping
    at a given video frame, but that using system time 0.0001s ticks is probably a worse option.


Current Limitations

    As the control grows smaller, or the video shorter, grabbing and playhead movement become
    "jerkier." Placement of many controls in the same page, and having the playbar paint co-
    rrectly still needs more code, and so does the time reporting as it does not exclude cummulative
    time [For version 2!!].


Compute logic, state transitions, and complexity for Video Time Segment Accounting

    Stats() calls its logInterval() function whenever a play or stop event is received,
    as relayed by Videop(). logInterval() can be in one of the following states and transitions:

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
        where f1() is the upperbound of appending at the end of our segments table array,
        which is naturally sorted. Yet none of these activites are algorithmically dependent
        on the number of existing entries, and no previous entries are looped over as no tallies 
        occur. Hence both f1() and f2() are more or less constant, independent
        of the current number of entries (as long as the arrays do not need to 
        be moved around in memory). Then we see that if we assume f1() and f2()
        to be constant, we have O(1). 

        Note: Even if ECMAScript moves the arrays everytime we make an insertion, 
        this would have a cost of O(n) in the worst case.


    Case 4: We were playing, now we are paused.
    logEntry()'s state transition: PLAY_BEGINS -> PLAY_STOPS
    Entry state transtion IN_PROGRESS -> COMPLETED w/videoStop time.

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
        traverse()'s fixed cost of visiting each node, so  O(f2(nq)) = O(nq) = O(n).

        The cost of add() and traverse() is both O(n) for each, but O(n) + O(n)
        can still be bounded by a different upperbound, still O(n). The complexity
        thus remains O(n). 

Compute logic, state transitions, and complexity for the Rest of the Control

        Similarly, painting the playbar and moving it, is also algorithmically linear,
        in theory growing in linear fashion to the size of the video, the time watched, 
        or the segments created.

        Hence algorithmically, all of this project's code should be O(n).

        This, however, does not mean that the computing experience scales smoothly. At some 
        point, with videoslarge enough, and with computers busy enough and hardpressed with low memory
        and demanding framerates in multiple videos and tasks, the system can tip to 
        actual performance that might be insufficient to the users --though not 
        'necessarily' related to the algorithms in this program.


Thank you! Please code-review to your furiously happy heart's content!

May the Code Force be with us Always!

Manuel Mendez