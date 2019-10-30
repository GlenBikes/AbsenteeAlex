// Exported functions
module.exports = {
  _chompTweet: chompTweet,
  _defaultReply: defaultReply,
  _GetRandomReply: GetRandomReply
};

var matches = /\bshaun scott\b/i.exec("Shaun Scott blah");
var result = "did not match";

if (matches != null && matches.length == 1) 
{
  result = 'matched'
} else {
  result = 'did not match'
}
console.log(`${result}`);

/* Setting things up. */
var fs = require('fs'),
  path = require('path'),
  express = require('express'),
  app = express(),   
  soap = require('soap'),
  Twit = require('twit'),
  convert = require('xml-js'),
  Mocha = require("mocha"),
  config = {
  /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/make-an-image-posting-twitter-bot/#creating-a-twitter-app*/      
    twitter: {
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET
    }
  },
  T = new Twit(config.twitter),
  maxIdFileLen = 100,
  maxErrorFileLen = 100,
  unrecognizedQuestionFileLen = 500,
  unrecognizedQuestionFile = "unrecognized_questions.txt",
  lastDMFilename = "last_dm_id.txt",
  lastMentionFilename = "last_mention_id.txt",
  errorFilename = "error.txt";

/*
  Once an hour, the bot will post a tweet (i.e. not a reply to another tweet).
  It picks a random entry from this list.
*/
var deepThoughts = [
  "Remember Seattle: Vote for me to ensure that @Amazon didn't waste $1.45 million.",
  "I am totally against big money in politics even though I applied for @SeattleChamber endorsement, knowing they would dump truckloads of money into my campaign.",
  "Wondering who to vote for in D4? Why not the candidate endorsed by local hate group Safe Seatte? Alex Pedersen: A favorite of hate groups since 2019.",
  "The news media has been relentlessly attacking me, saying that I can't be bothered to show up at candidate forums, not even those put on by SPOG, @MASSCoalition,... This is true, but the reason is I just DGAF about the voters.\n\nVote Alex Pedersen!"
];


/*
  These are the set of regular expressions that the bot searches for in tweets that mention it.
  The key is the key that will be used in the responses hash to find the list of possible responses
  to a tweet that matches one of the regexes for that key.
*/
var regexes = {
  'housing': [
    /\bhousing\b/i
  ],
  'shaunscott': [
    /\u0040ElectScott2019\b/i,
    /\bshaun scott\b/i
  ],
  'homelessness': [
    /\bhomelessness\b/i,
    /\bhomeless\b/i
  ],
  'Amazon': [
    /\bamazon\b/i
  ],
  'PAC': [
    /\bPAC\b/i,
    /\bPACs\b/i,
    /\boutside spending\b/i
  ],
  'CAPE': [
    /\bCAPE\b/i,
    /\bchamber\b/i
  ],
  'CASE': [
    /\bCASE\b/i
  ],
  'absent': [
    /\bmiss\b/i,
    /\bshow up\b/i,
    /\bskip\b/i,
    /\bno[- ]show\b/i
  ],
  'why': [
    /\bwhy\b/i,
    /\bhow come\b/i
  ],
  'when': [
    /\bwhen\b/i,
    /\bwhat time\b/i
  ]
};

/*
  These are the responses that the bot can give. See above regexes
  hash to see what text will match.
*/
var responses = {
  'shaunscott': [
    "Remember not to vote for @ElectScott2019 or you'll end up with a councilmember for D4 who will represent the entire district rather than just representing @Amazon and the largely older, largely whiter, D4 landowners."
  ],
  'housing': [
    "Housing affordability is a huge issue in Seattle. But I DGAF cause I have a house and @SeattleChamber @Amazon are buying me a council seat which means I'll also have a job. Something something communities of color and displacement. Council must live within its means. https://electalexpedersen.org/accountability-for-affordability/",
    "While I fully support @MayorJenny's process of spending $10M/year to sweep homeless people around the city and not actually accomplish anything, I also... wait... lost my train of though there. Something something accountability something audit. https://electalexpedersen.org/accountability-and-homelessness/"
  ],
  'homelessness': [
    "My plan for addressing homelessness is pretty simple: arrest all the people who are homelss, but say a bunch of compassionate buzzwords and wqave my hands if anyone asks how I'm planning to pay to lock up 1000's of people just because they happen to be poor. https://electalexpedersen.org/accountability-and-homelessness/",
    "While I fully support @MayorJenny's process of spending $10M/year to sweep homeless people around the city and not actually accomplish anything, I also... wait... lost my train of though there. Something something accountability something audit. https://electalexpedersen.org/accountability-and-homelessness/"
  ],
  'PAC': [
    "I am totally against PACs. I can't help it that the endorsements I applied for such as @SeattleMayorTim and @SeattleChamber are really just fronts for dumping money into local conservacandidate campaigns.",
    "I totally do not coordinate with any of the PACs that are spending truckloads of money to buy me a seat on @SeattleCouncil."
  ],
  'CASE': [
    "I am not familiar with CASE. Is that a conservative PAC that is trying to buy an entire @SeattleCouncil? Never heard of them.",
    "Seattle: Remember to vote for the D4 candidate that @SeattleChamber (aka @Amazon) has dumped 100's of 1000's of $$$ to buy a seat. Alex Pedersen."
  ],
  'CAPE': [
    "Remember Seattle: Don't vote for any candidate endorsed by @capecampaigns. This is a big money group, probably funded by Soros, trying to buy an election. Unlike @SeattleChamber who are totally the good guys.",
    "You seem to be asking about @capecampaigns. They want you to vote for @ElectScott2019 which you should totally not do. I would've told you that at the candidate forums but couldn't be bothered to go.",
    "Definitely do not vote for @ElectScott2019 as @capecampaigns wants you to. If you do, you'll end up with a councilmember who actually listens to everyone and has plans. Who needs plans when you have @Amazon's money?"
  ],
  'Amazon': [
    "I buy all my campaign signs on @Amazon",
    "I didn't take money from @Amazon! Amazon gave $1.45M to @SeattleChamber and @SeattleChamber is kindly spending a bunch of it to buy my council seat. But I will listen to all voices. For sure.",
    "Sorry I didn't catch that. I had too much of @JeffBezos' money in my ears.",
    "I will listen to all voices. As long as those voices are telling me to do what my evil corporate overlord wants me to do. Other than that though... all voices. Especially wealthy white landowning voices of the boomer persuasion since their voices should obvs carry more weight than yours."
  ],
  'absent': [
    "I'll listen to all voices. Except for the people at forums I've missed like @MASSCoalition, @Tech4Housing, #homelessness, @UrbanistOrg, @RootedInRights, ..."
  ],
  'why': [
    "Why? Because I can't be bothered."
  ],
  'when': [
    "When? I'll get back to you after the election. Until then remember to vote for @AbsenteeAlex!"
  ]
};

// Export these for testing
module.exports._regexes = regexes;
module.exports._responses = responses;

console.log(`${process.env.TWITTER_HANDLE}: start`);
/*
logTweetById("1184633776762228736");
logTweetById("1184633777714335746");
logTweetById("1184651910126530560");
*/


var maxTweetLength = 280;
var tweets = [];
function defaultReply () { return "I don't understand your question. But why don't we meet at the next candidate forum and talk in person? Or not. I may just not show up." }
var noCitations = "No citations found for plate # ";
var noValidPlate = "No valid license found. Please use XX:YYYYY where XX is two character state/province abbreviation and YYYYY is plate #";
var parkingAndCameraViolationsText = "Total parking and camera violations for #";
var violationsByYearText = "Violations by year for #";
var violationsByStatusText = "Violations by status for #";
var statesAndProvinces = [ 'AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FM', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MH', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR', 'PW', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'VA', 'WA', 'WV', 'WI', 'WY', 'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT' ];
var licenseRegExp = /\b([a-zA-Z]{2}):([a-zA-Z0-9]+)\b/;
var botScreenNameRegexp = new RegExp("@" + process.env.TWITTER_HANDLE + "\\b", "ig");

app.use(express.static('public'));

var listener = app.listen(process.env.PORT, function () {
  console.log(`Your bot is running on port ${listener.address().port}`);
});

/* tracks the largest tweet ID retweeted - they are not processed in order, due to parallelization  */
var app_id = -1;

/* uptimerobot.com is hitting this URL every 5 minutes. */
app.all("/reply", function (request, response) {
  ensureBotID();
  
  /* Respond to @ mentions */
  /* First, let's load the ID of the last tweet we responded to. */
  var last_mention_id = getLastMentionId();
  if (last_mention_id != undefined) {
    /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
    T.get('search/tweets', { q: '%40' + process.env.TWITTER_HANDLE, since_id: last_mention_id, tweet_mode: 'extended' }, function(err, data, response) {
      if (err) {
        handleError(err);
        return false;
      }
      
      if (data.statuses.length){
        /* 
        Iterate over each tweet. 
        
        The replies can occur concurrently, but the threaded replies to each tweet must, 
        within that thread, execute sequentially. 
        
        Since each tweet with a mention is processed in parallel, keep track of largest ID
        and write that at the end.
        */
        var maxTweetIdRead = -1;
        data.statuses.forEach(function(status) {
          console.log(`Found ${printTweet(status)}`);
          
          if (maxTweetIdRead < status.id_str) {
            maxTweetIdRead = status.id_str;
          }

          /*
          Make sure this isn't a reply to one of the bot's tweets which would
          include the bot screen name in full_text, but only due to replies.
          */
          const {chomped, chomped_text} = chompTweet(status);

          if (!chomped || botScreenNameRegexp.test(chomped_text)) {
            /* Don't reply to our own tweets. */
            if (status.user.id == app_id) {
              console.log('Ignoring our own tweet: ' + status.full_text);
            }
            else {
              // OK, process this one.
              var reply = [ GetRandomReply(status.full_text)];
              
              SendResponses(status, reply, true);
            }
          }
          else {
            console.log("Ignoring reply that didn't actually reference bot: " + status.full_text);
          }
        });
        
        if (maxTweetIdRead > last_mention_id) {
          setLastMentionId(maxTweetIdRead);
        }
      } else {
        /* No new mentions since the last time we checked. */
        console.log('No new mentions...');      
      }
    });    
  }

  /* Respond to DMs */
  /* Load the ID of the last DM we responded to. */
  var last_dm_id = getLastDmId();
  if (last_dm_id == undefined) {
    handleError(new Error("ERROR: No last dm found! Defaulting to zero."));
    last_dm_id = 0;
  }
  
  T.get('direct_messages', { since_id: last_dm_id, count: 200 }, function(err, dms, response) {
    /* Next, let's DM's to our bot, starting after the last DM we responded to. */
    if (dms.length){
      dms.forEach(function(dm) {
        console.log(`Direct message: sender (${dm.sender_id}) id_str (${dm.id_str}) ${dm.text}`);

        /* Now we can respond to each tweet. */
        T.post('direct_messages/new', {
          user_id: dm.sender_id,
          text: "This is a test response."
        }, function(err, data, response) {
          if (err){
            /* TODO: Proper error handling? */
            handleError(err);
          }
          else{
            setLastDmId(dm.id_str);
          }
        });
      });
    } else {
      /* No new DMs since the last time we checked. */
      console.log('No new DMs...');      
    }
  });    
  
  /* TODO: Handle proper responses based on whether the tweets succeed, using Promises. For now, let's just return a success message no matter what. */
  response.sendStatus(200);
});

/* uptimerobot.com is hitting this URL once an hour during daytime hours. */
app.all("/tweet", function (request, response) {
  var now = new Date();
  var currentHour = (now.getHours() + 24 - 7) % 24;
  
  console.log(`Current hour: ${currentHour}, full time: ${now}.`);
  
  if (currentHour >= 7 && currentHour <= 23) {
    // tweet
    console.log(`Would tweet.`);
    TweetRandomThought();
  }

  response.sendStatus(200);
});

app.all("/test", function (request, response) {
  // Instantiate a Mocha instance.
  var mocha = new Mocha();

  var testDir = "./test";

  // Add each .js file to the mocha instance
  fs.readdirSync(testDir)
    .filter(function(file) {
      // Only keep the .js files
      return file.substr(-3) === ".js";
    })
    .forEach(function(file) {
      console.log(`Found test file ${file}.`);
      mocha.addFile(path.join(testDir, file));
    });

  // Run the tests.
  mocha.run(function(failures) {
    // TODO: process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
    response.sendStatus(200);
  });
});

app.all("/dumpfile", function (request, response) {
  var fileName = `${__dirname}/${lastMentionFilename}`;
  
  if (request.query.hasOwnProperty("filename")) {
    fileName = `${__dirname}/${request.query.filename}`;
  }
  console.log(`Sending file: ${fileName}.`)
  response.sendFile(fileName);
});

app.all("/dumptweet", function (request, response) {
  if (request.query.hasOwnProperty("id")) {
    var tweet = getTweetById(request.query.id).then( function (tweet) {
      response.set('Cache-Control', 'no-store');
      response.json(tweet);
    });
  }
  else {
    handleError(new Error("Error: id is required for /dumptweet"));
  }
});

app.all("/errors", function (request, response) {
  var fileName = `${__dirname}/${errorFilename}`;

  console.log(`Sending file: ${fileName}.`)
  response.sendFile(fileName);
});

function chompTweet(tweet) {
  // Extended tweet objects include the screen name of the tweeting user within the full_text,  
  // as well as all replied-to screen names in the case of a reply.
  // Strip off those because if UserA tweets a license plate and references the bot and then
  // UserB replies to UserA's tweet without explicitly referencing the bot, we do not want to
  // process that tweet.
  var chomped = false;
  var text = tweet.full_text;

  if (tweet.display_text_range != null && tweet.display_text_range.length >= 2 && tweet.display_text_range[0] > 0) {
    text = tweet.full_text.substring(tweet.display_text_range[0]);
    chomped = true;
  }
  
  return {
    chomped: chomped,
    chomped_text: text
  }
}
function TweetRandomThought() {
  var tweet = deepThoughts[Math.floor(Math.random() * deepThoughts.length)];
  
  console.log(`Sending deep thought: ${tweet}.`)
  SendTweet(tweet);
}

function GetRandomReply( tweet_text ) {
  var reply;

  // Go through the regexes until we find one that matches
  for (const key in regexes) {
    console.log(`key: ${key}.`);
    
    if (reply) break;
    
    // Now go through the regexes under this key
    for (var i = 0; i < regexes[key].length; i++) {
      const regex = regexes[key][i];
      console.log(`regex: ${regex}.`);

      const matches = regex.exec(tweet_text);
      
      if (matches && matches.length > 0) {
        // OK, we found a matching regex. Pick a random response for this key.
        reply = responses[key][Math.floor(Math.random() * responses[key].length)];
        break;
      }
    }
  }
  
  if (reply == null) {
    console.log("returning default reply.");
    reply = defaultReply();
    
    // Log this question to make it easy to review what people were asking.
  }
  
  console.log(`Returning '${reply}'`);
  return reply;
}

function SendTweet( tweet ) {
  try {
    /* Send the tweet. */
    (new Promise(function (resolve, reject) {
      T.post('statuses/update', { status: tweet }, function(err, data, response) {
        if (err){
          reject(err);
        }
        else{
          console.log(`Sent tweet: ${printTweet(data)}`);
          resolve(data);
        }
      });
    })).catch( function ( err ) {
      handleError(err);
    });
  }
  catch ( e ) {
    handleError(e);
  }
}

function SendResponses(origTweet, tweets, verbose) {
  var tweetText = tweets.shift();
  var replyToScreenName = origTweet.user.screen_name;
  var replyToTweetId = origTweet.id_str;
  
  try {
    /* Now we can respond to each tweet. */
    tweetText = "@" + replyToScreenName + " " + tweetText;
    (new Promise(function (resolve, reject) {

      T.post('statuses/update', {
        status: tweetText,
        in_reply_to_status_id: replyToTweetId,
        auto_populate_reply_metadata: true
      }, function(err, data, response) {
        if (err){
          reject(err);
        }
        else{
          console.log(`Sent tweet: ${printTweet(data)}`);
          resolve(data);
        }
      });
    })).then ( function ( sentTweet ) {      
      // Wait a bit. It seems tweeting a whackload of tweets in quick succession
      // can cause Twitter to think you're a troll bot or something and then some
      // of the tweets will not display for users other than the bot account.
      // See: https://twittercommunity.com/t/inconsistent-display-of-replies/117318/11
      if (tweets.length > 0) {
        //sleep(500).then(() => {
          SendResponses(sentTweet, tweets, verbose);
        //});
      }
    }).catch( function ( err ) {
      handleError(err);
    });
  }
  catch ( e ) {
    handleError(e);
  }
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
    var out = '';
    if (typeof indent === 'undefined') {
        indent = 0;
    }
    for (var p in o) {
        if (o.hasOwnProperty(p)) {
            var val = o[p];
            out += new Array(4 * indent + 1).join(' ') + p + ': ';
            if (typeof val === 'object') {
                if (val instanceof Date) {
                    out += 'Date "' + val.toISOString() + '"';
                } else {
                    out += '{\n' + printObject(val, indent + 1) + new Array(4 * indent + 1).join(' ') + '}';
                }
            } else if (typeof val === 'function') {

            } else {
                out += '"' + val + '"';
            }
            out += ',\n';
        }
    }
    return out;
}

function getLastDmId() {
  return getLastIdFromFile(lastDMFilename);
}

function getLastMentionId() {
  return getLastIdFromFile(lastMentionFilename);
}

function getLastIdFromFile(filename) {
  const lineByLine = require('n-readlines', function (err) {
    if (err) {
      handleError(err);
    }
  });
  
  try {
    const filepath = `${__dirname}/${filename}`;
    const liner = new lineByLine(filepath);
    var lastIdRegExp = /\b(\d+)(: [\d\.\: ])?\b/;
    var lastId;
    let line;

    while (line = liner.next()) {
      /* strip off the date if present, it's only used for debugging. */
      /* First, let's load the ID of the last tweet we responded to. */
      const matches = lastIdRegExp.exec(line);
      if (matches == null || matches.length < 1) {
        handleError(new Error(`Error: No last mention found: ${line}`));
      }
      else if (lastId == undefined) {
        lastId = matches[1];
        break;
      }
    }
  }
  catch ( err ) {
    handleError(err);
  }
    
  return lastId;
}
  
function logUnrecognizedQuestion(question) {
  console.log(`Writing unrecognized question: ${question}.`)
  prependFile(unrecognizedQuestionFile, question, unrecognizedQuestionFileLen)
}

function setLastDmId(lastDmId) {
  console.log(`Writing last dm id ${lastDmId}.`)
  setLastIdInFile(lastDMFilename, lastDmId, maxIdFileLen)
}

function setLastMentionId(lastMentionId) {
  console.log(`Writing last mention id ${lastMentionId}.`)
  setLastIdInFile(lastMentionFilename, lastMentionId, maxIdFileLen)
}

function setLastIdInFile(filename, lastId, maxLines) {
  var filepath = `${__dirname}/${filename}`;
  var today = new Date();
  var newLine = lastId + ": " + today.toLocaleDateString() + " " + today.toLocaleTimeString();

  prependFile(filepath, newLine, maxLines);
}

function prependFile(filePath, newLines, maxLines) {
  // Read file into memory
  var textBuf = fs.readFileSync(filePath);
  var textByLines = textBuf.toString().split("\n");
  
  textByLines = newLines.split("\n").concat(textByLines);
  
  // truncate to specified number of lines
  textByLines = textByLines.slice(0, maxLines);
  
  fs.writeFileSync(filePath, textByLines.join("\n"), function (err) {
    if (err) {
      handleError(err);
    }
  });
}

// Print out subset of tweet object properties.
function printTweet(tweet) {
  return "Tweet: id: " + tweet.id + 
    ", id_str: " + tweet.id_str + 
    ", user: " + tweet.user.screen_name + 
    ", in_reply_to_screen_name: " + tweet.in_reply_to_screen_name + 
    ", in_reply_to_status_id: " + tweet.in_reply_to_status_id + 
    ", in_reply_to_status_id_str: " + tweet.in_reply_to_status_id_str + 
    ", " + tweet.full_text;
}

function handleError(error) {
  var filepath = `${__dirname}/${errorFilename}`;
  var today = new Date();
  var date = today.toLocaleDateString();
  
  //var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var time = today.toLocaleTimeString();
  var dateTime = date + ' ' + time;
  
  console.log(`ERROR: ${error}`);

  // Truncate the callstack because only the first few lines are relevant to this code.
  var stacktrace = error.stack.split("\n").slice(0, 10).join("\n");
  var formattedError = `============================== ${dateTime} =========================================\n${error.message}\n${stacktrace}`;
  
  prependFile(filepath, formattedError, maxErrorFileLen);
}

function logTweetById(id) {
  // Quick check to fetch a specific tweet and dump it fullyt
  var tweet = getTweetById(id);
  
  if (tweet) {
    console.log(`logTweetById (${id}): ${printObject(tweet)}`);
  }
}

function getTweetById(id) {
  // Quick check to fetch a specific tweet.
  return new Promise((resolve, reject) => {
    var retTweet;
    
    T.get(`statuses/show/${id}`, { tweet_mode: 'extended'}, function(err, tweet, response) {
      if (err) {
        handleError(err);
        reject(tweet);
      }

      resolve(tweet);
    });
  });
}

// We only want to call this once per application since it counts
// against our throttle limit. Twitter allows only 100 "read" calls
// per hour. Once the bot's account (not the app but the account)
// reaches that, twitter returns Error: Rate limit exceeded to all
// read requests. The bot can still post tweets, but it can't 
// search for tweets to repl;y to.
function ensureBotID() {
  // Check if we've done this already
  if (app_id) {
    console.log("Getting bot's id...");
    
    /* Get the current user account (victimblame) */
    T.get('account/verify_credentials', { }, function(err, data, response) {
      if (err){
        handleError(err);
        return false;
      }
      app_id = data.id;
    });
  }
}
  


// Fake a sleep function. Call this thusly:
// sleep(500).then(() => {
//   do stuff
// })
// Or similar pattrs that use the Promise:
// async function myFunc() {
//   await sleep(1000);
// }
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}