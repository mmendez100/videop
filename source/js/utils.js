"use strict";

function prntI(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 3, 
		maximumFractionDigits: 0, useGrouping:false});

}

function prntF(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 4, 
		minimumFractionDigits: 4, useGrouping:false});

}