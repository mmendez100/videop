"use strict";

function prntI(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 3, 
		maximumFractionDigits: 0, useGrouping:false});

}

function prntF(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 4, 
		minimumFractionDigits: 4, useGrouping:false});

}

function prntF2(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 2, 
		minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping:false});

}


function prntP(val) {

	return ((val)*100.0).toLocaleString('en-US', {minimumIntegerDigits: 1, 
		minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping:false}) + "%";

}
