// Exported functions that unit tests need.
module.exports = {
  _splitLines: SplitLongLines,
  _printObject: printObject,
  _getUUID: getUUID,
  _compare_numeric_strings: compare_numeric_strings
};

// modules
const uuidv1 = require("uuid/v1");


// Wrap this so we can stub it.
function getUUID() {
  return uuidv1();
}

/*
 * Split array of strings to ensure each string is <= max_len
 *
 * Params:
 *   source_lines: array of strings (each one may be multi-line)
 *   max_len:       maximum length for each element in source_lines
 *   number_linens: append 1\_, 2\_, ... 8\8 to end of lines
 * Returns:
 *   array of strings matching source_lines but with any elements longer
 *   than max_len, broken up into multiple entries, breaking on in order:
 *   - newlines (trailing newlines on broken elements are removed)
 *   - word breaks
 *   - if neither above exist, then just split at max_len characters
 *
 * Note: elements in source_lines are not joined if < max_len, only broken
 *       up if > max_len
**/
function SplitLongLines( source_lines, max_len, number_lines ) {

  var truncated_lines = [];
  
  if (number_lines) {
    max_len = max_len - 9; // allow room for 2 digit numbering up to "... 99\99"
  }
  
  var index = 0;
  var current_line = "";
  var first_line = true;
  source_lines.forEach(source_line => {
    if (current_line.length + source_line.length < max_len) {
      if (!first_line) {
        current_line += '\n';
      }
      current_line += source_line;
      first_line = false;
      return;
    }
    
    // break it up into lines to start with
    var chopped_lines = source_line.split("\n");

    chopped_lines.forEach(line => {
      if (current_line.length + line.length + (first_line ? 0 : 1) > max_len) {
        // We can't append the full line to current_line, see if 
        // we can tack on part of it.
        // But first do a sanity check to make sure we don't end up with a one
        // or two word line
        if (current_line.length > max_len*0.8) {
          // Don't bother trying to add part of the next line
        }
        else {
          var truncate_index = max_len - current_line.length - 1 - (first_line ? 0 : 1);

          // Go back until we hit a whitespace characater
          while (truncate_index > 0 && !/\s/.test(line[truncate_index])) {
            truncate_index--;
          }

          if (truncate_index == 0 && current_line.length == 0) {
            // The line has no whitespace in it, just chop it in two
            truncate_index = max_len - current_line.length - 1;

            current_line += line.substring(0, truncate_index + 1);
            line = line.substr(truncate_index + 1);
            first_line = false;
          }
          else if (truncate_index == 0) {
            // There is no word-break early enough for us to tack 
            // something on to the end of current_line, so we will
            // just use current_line as is
          }
          else {
            // Append this chunk to current line
            if (!first_line) {
              current_line += '\n';
            }

            current_line += line.substring(0, truncate_index + 1);
            line = line.substr(truncate_index + 1);
            first_line = false;
          }
          
          truncated_lines.push(current_line);
          current_line = "";
          first_line = true;
          
          if (line.length > 0) {
            if (line.length == 332 || line.length == 399 || line.length == 339 || line.length == 367 || line.length == 326) {
              debugger;
            }
            // The rest of the string may still be too long.
            // Call ourselves recursively to split it up.
            var rest_truncated_lines = SplitLongLines(
              [line],
              max_len
            );
            
            // Add the first n-1 of those lines and set the current_line
            // to the nth one since we may be able to add more to it
            if (!rest_truncated_lines || rest_truncated_lines.length <= 0) {
              debugger;
              throw "rest_truncated_lines is empty!"
            }
            current_line = rest_truncated_lines.pop();
            truncated_lines = truncated_lines.concat(rest_truncated_lines);
            first_line = false;
          }
        }
      } else {
        if (!first_line) {
          current_line += '\n';
        }
        current_line += line;
        first_line = false;
      }
    });
  });

  if (current_line.length > 0) {
    truncated_lines.push(current_line);
    
    // We're done but just to be safe...
    current_line = "";
    first_line = true;
  }
  
  if (number_lines && truncated_lines.length > 1) {
    // append line numbers
    for (var i = 0; i < truncated_lines.length; i++) {
      // Add ... to all but the last line
      if (i < (truncated_lines.length - 1)) {
        truncated_lines[i] += `...`;
      }
      truncated_lines[i] += ` ${i+1}\\${truncated_lines.length}`;
    }
  }

  return truncated_lines;
}


/**
 * When investigating a selenium test failure on a remote headless browser that couldn't be reproduced
 * locally, I wanted to add some javascript to the site under test that would dump some state to the
 * page (so it could be captured by Selenium as a screenshot when the test failed). JSON.stringify()
 * didn't work because the object declared a toJSON() method, and JSON.stringify() just calls that
 * method if it's present. This was a Moment object, so toJSON() returned a string but I wanted to see
 * the internal state of the object instead.
 *
 * So, this is a rough and ready function that recursively dumps any old javascript object.
 */
function printObject(o, indent) {
  var out = "";
  if (typeof indent === "undefined") {
    indent = 0;
  }
  for (var p in o) {
    if (o.hasOwnProperty(p)) {
      var val = o[p];
      out += new Array(4 * indent + 1).join(" ") + p + ": ";
      if (typeof val === "object") {
        if (val instanceof Date) {
          out += 'Date "' + val.toISOString() + '"';
        } else {
          out +=
            "{\n" +
            printObject(val, indent + 1) +
            new Array(4 * indent + 1).join(" ") +
            "}";
        }
      } else if (typeof val === "function") {
      } else {
        out += '"' + val + '"';
      }
      out += ",\n";
    }
  }
  return out;
}

String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}

function compare_numeric_strings(a, b) {
  if (a.length > b.length) {
    b = b.lpad('0', a.length);
  }
  
  if (b.length > a.length) {
    a = a.lpad('0', b.length);
  }
  
  if (a == b) {
    return 0;
  } else if (a < b) {
    return -1;
  } else {
    return 1;
  }
}

