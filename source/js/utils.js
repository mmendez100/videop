"use strict";

// The purpose of utils is to enclose the utility functions (the only non-OOP coding of this
// project) used to print floating and percentage points with specific formatting. Rather than
// use toPrecision, and to try to set leading zeroes with .Splice, this routine uses the very
// versatile .toLocaleString powers such as min and max Integer and Fraction digits.

// Print integers with a min of three integer digits, zeroes if needed
function prntI(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 3, 
		maximumFractionDigits: 0, useGrouping:false});

}

// Print floats with 4 digit integers and 4 digit fractional components
function prntF(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 4, 
		minimumFractionDigits: 4, useGrouping:false});

}

// Print floatswith no more than 2 fractional parts, at least 2 integer parts, with zeroes as needed
function prntF2(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 2, 
		minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping:false});

}

// Print floatswith no more than 3 fractional parts, at least 2 integer parts, with zeroes as needed
function prntF3(val) {

	return (val).toLocaleString('en-US', {minimumIntegerDigits: 2, 
		minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping:false});

}


// Take care of printing a fractional part as a percent, with % attached, 2 fractional digits.
function prntP(val) {

	return ((val)*100.0).toLocaleString('en-US', {minimumIntegerDigits: 1, 
		minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping:false}) + "%";

}
