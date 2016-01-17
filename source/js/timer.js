"use strict";
/*

 A Timer class that encapsulates timers and allows us to call them in OOP fashion.
 The major benefit here is that once a timer is instantiated and fire away,
 any callback is no longer a worry to the class doing the work.

 M Mendez / Jan 17

*/

function Timer(interval, callback, logger)
{        
  this.logger = logger;

    // Store interval
    this.interval = interval;
  this.logger.assert(this.interval > 0, "Invalid interval fed to Timer constructor!");
    
    // Store callback. Notice, most useful if the callback is already bound correctly!
    this.callback = callback;
  this.logger.assert(this.callback != null, "Null interval fed to Timer constructor!");
  
    // We start off
    this.enabled = false;

    // Javascript timer ID
    this.timerID = -1;

  this.logger.log("Timer constructor: New Timer Ready but off!!");

}
// Function: Start the timer
Timer.prototype.start = function()
{
    // Cannot start a timer twice!
    if (this.enabled) {
      this.logger.log("Timer start ignored! Starting the same timer twice!",
        this.logger.levelsEnum.WARN);
      return;
    } 
    // OK, start it
    this.enabled = true;
    this.timerID = setInterval(this.callback, this.interval);
    this.logger.log("Started timer. Interval=" + this.interval + ", timerId=" + this.timerID);        
};
    
// Function: Stops the timer
Timer.prototype.stop = function()
{
    if (this.enabled == false) {
      this.logger.log("Timer stop for timerId=" + this.timerID + ". Timer was already stopped.",
        this.logger.levelsEnum.INFO);
      return;
    }             
    this.enabled = false;
    clearInterval(this.timerID);
    this.logger.log("Stopped timer. timerId=" + this.timerID); 
};

