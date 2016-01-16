"use strict";
////////////////// Main ////////////////////

// We attach an instance of class Videop to the existing video player.
// specifying the playbar's CSS style (here 'playbar') and its size or ratio ("thickness")
// (here 8%). In addition, "#FFD700" specifies the color of the playhead and "#8B0000"
// the 'bold' color of the playhead. The playhead turns 'bold' when it becomes grabbable by the
// user, i.e. when the user's mouse hovers over it.
var videoPlayer1 = new Videop("video1", "playbar", "#FFD700", "#8B0000", 0.08);

