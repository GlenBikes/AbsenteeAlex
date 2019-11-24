// Exported functions
module.exports = {
  _chompTweet: chompTweet,
  _GetRandomReply: GetRandomReply
};

/* Setting things up. */
const fs = require('fs'),
  path = require('path'),
  express = require('express'),
  app = express(),   
  soap = require('soap'),
  string_utils = require('./utils/stringutils.js'),
  Twit = require('twit'),
  convert = require('xml-js'),
  Mocha = require("mocha");

const config = {
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
  failedQuestionsFileLen = 500,
  failedQuestionsFile = "failed_questions.txt",
  lastDMFilename = "last_dm_id.txt",
  lastMentionFilename = "last_mention_id.txt",
  errorFilename = "error.txt",
  maxTweetLength = 280 - 17; // Max username is 15 chars + '@' plus the space after the full username
;

/* Once an hour, the bot will post a tweet (i.e. not a reply to another tweet)
   giving deep thoughts from Alex's legislative aid Toby Thaler.
*/
var toby_thaler_prefixes = [
  "As my legislative aid Toby Thaler has said before:\n\n",
  "Remember Seattle, according to my legislative aid Toby Thaler:\n\n",
  "Seattle, if you're wondering if I will represent you, just remember what my legislative aid Toby Thaler previously said:\n\n",
  "Here's a great quote from my legislative aid Toby Thaler, a thought leader in Seattle who is totally not racist, classist or a social media troll:\n\n"
];

var toby_thaler_quotes = [
  "\"Seattle, like the rest of the planet, has limited carrying capacity. You are the fucking idiot.\"",
  "\"You are truly a fucking idiot as well as rude asshole. Truly, madly, deeply a proponent of reactionary bullshit.\"",
  "\"You don’t know shit about me, asshole. Maybe if you used your great intellect and actually read my posts you’d realize your statement is incorrect.\"",
  "\"If you mean “do nothing about rental housing that presents health and safety risks” that’s the only conclusion I can see in your posts other than that you cannot put six words together without being an asshole.\"",
  "\"I do not think \“switching to less destructive forms of energy and production\” can solve the crisis without also reducing human population. Even if we all returned to some pseudo agrarian utopia and became 90% vegetarian, I don’t think there are enough resources on the planet to sustain 8 or 9 billion people.\"",
  "\"If I had dictatorial power: No development activity or economic activity is allowed unless it can show with a high degree of certainty that the activity won’t have an adverse impact on the commons. We have screwed up so much already, it’s a high burden. We’re out of time, folks. Population needs to be reduced (most scientists say we’re beyond Earth’s carrying capacity), but that probably solves itself if we attain full equality, civil rights, education access, etc. for every human born.\"",
  "\"Regardless, the bottom line is the bottom line: How much population growth are we going to tolerate before we realize that ever more not only leads to unacceptable consequences but is also physically impossible?\"",
  "\"Oh, so you think growth is sustainable? Do you really believe there are no limits to growth? Just for clarity: by growth I mean an increase in the number of people needing to be fed, housed, clothed, educated, and entertained in any particular ecosystem.\"",
  "\"Far be it from me to \"keep this barbed wire up to keep others out\" -- I just want some real democracy in the policy making for dealing with the growth that occurs until we either attain a truly sustainable economy, or the economy/civilization collapses due to overshoot and/or inequity. The ultimate and barely spoken issue is over population. If l really was the sky Dog, I'd make people stop bleeding after one per couple. At least until we got back down to a more truly sustainable population, like maybe a billion or two.\"",
  "\"Where between 750,000 and 14,000,000 does Seattle want to be? Do the growth addicts really think there are no limits?\"",
  "\"You don’t know shit about me, asshole. Maybe if you used your great intellect and actually read my posts you’d realize your statement is incorrect.\"",
  "\"You really don’t get it. You’re addicted to growth. Get help.\"",
  "\"It’s blanket up zones with no effective voice at the table that causes the most opposition. In fact the table has been dismantled and no longer exists. When we had neighborhood planning a great deal of increased density was provided for.\"",
  "\"What are you, a brownshirt fascist thug?\"",
  "\"In addition to being an obnoxious troll, you are sick with logorrhea.\"",
  "\"I am not opposed to changes in zoning to make building housing easier. If you had a clue on how to be at least diplomatic (not even asking for polite, let alone cordial), you might figure out where people like me are willing to go along with you to the Council to actually make changes happen. However, you are such an (anonymous) asshole that it appears you are incapable of doing any of that. Happy New Year. P.s. Applies to your friend as well.\"",
  "\"You still haven’t answered; what race/ethnicity do you consider yourself?\"",
  "\"I have been blocked by urbanists on facebook because I'm \"a sick person\" who \"hopes for society's collapse\". But I still try to engage, even with the most offensive anonymous trolls like urbanista. And I don't think all \'urbanists\' are like him (gender presumed); we're all prone to do it, but generalizing is a dangerous game. (I did it in the post just above! but at most it was aimed at the ideology not particular persons.\"",
  "\"And you are ignorant: calling you stupid is no ad hominem. Look it up. Look up something anything.\"",
  "\"I totally support eh Stone Way road diet. But I’m voting no on Move Seattle. For a billion bucks we should be getting some serious capital fixes, not road diets and new paving on arterials.\"",
  "\"The real issue IMO is when are we going to acknowledge, let alone act on the fact, that we are past the point when further growth makes any sense.\"",
  "\"\“There is literally not enough housing.\” I don’t believe this is accurate. The problem is misallocation of wealth, not housing. It’s just like food: There is enough food in the world for everyone, but there are starving people.\"",
  "\"\"Homeownership is a key for neighborhood quality,\" said Toby Thaler, president of the Fremont Neighborhood Council, who was critical of a lot of the recommendations made to add density to single-family zones. \"If you let the entire single-family zones become rental, the cohesion of the neighborhoods, especially the close-in ones, is essentially going to get eroded away. It's a disturbing trend and it's part of the whole erosion of homeownership.\"",
  "\"I’m not going to read a long piece by you as justification for your position.\"",
  "\"I am an experienced lawyer and political actor. I do not engage in such discussions with my mind closed or set on any specific point \“by definition.\”\"",
  "\"Density is not a good policy response if the problem you're trying to solve is anthropogenic global warming.\"",
  "\"I disagree with your facile conclusion (\"the restrictions on multi family development in this neighborhood are the legacy of a racist white property-owning class\"). First, there is no restriction on MF development \"in this neighborhood.\" (And BTW, which specific \"neighborhood\" do you mean? Seattle?) And the connection of the current growth boom and its impacts to past racist red-lining and other practices is nonexistent. It's the big lie of Mayor Murray's HALA.\"",
  "\"I far prefer a bit of Fremont bud.\"",
  "\"The capacity is there, and it's being used in case you haven't noticed. You just don't like where it is. Do you keep your eyes closed while moving around the city?\""
];

/*
  Once an hour, the bot will post a tweet (i.e. not a reply to another tweet).
  It picks a random entry from each of these lists and concatenates them together.
*/
var deep_thought_prefixes = [
  "Seattle: ",
  "Hey Seattle! ",
  "Remember Seattle: ",
  "Don't forget Seattle: ",
  "Seattle voters: ",
  "Seattle progressives: "
];

var deep_thoughts = [
  "Thank you for voting for me or at least not voting for @ElectScott2019. Also a big shout out to @RepJayapal for effectively endorsing me. I couldn't have done it w/o you. Voters: See you in 2023.",
  "Thank you for electing me. Now I no longer have to pretend to GAF about any of you non white or non-wealthy or non-homeowning non-car-driving miscreants who want to whine to me about inequity. Deal with it. I'll see you in summer 2023."
  /*
  "Vote for me to ensure that @Amazon didn't waste $1.45 million.",
  "I am totally against big money in politics even though I applied for @SeattleChamber endorsement, knowing they would dump truckloads of money into my campaign.",
  "Wondering who to vote for in D4? Why not the candidate endorsed by local hate group Safe Seatte?\n\nAlex Pedersen: A favorite of hate groups since 2019.",
  "The news media has been relentlessly attacking me, saying that I can't be bothered to show up at candidate forums, not even those put on by SPOG, @MASSCoalition,... This is true, but the reason is I just DGAF about the voters.\n\nVote Alex Pedersen!",
  "Miss out asking me about my policy positions cause I skipped most candidate forums? Fear not Seattle! Just go to my campaign site where I lay out in excruiatingly vague language how I will do all this very expensive stuff w/o taxing @Amazon. https://electalexpedersen.org/accountability/",
  "Vote for Alex Pedersen or Uncle Jeff will make sure your #AmazonPrime next day deliveries will be routed through Uzbekistan, Belarus and Bhutan.",
  "My @CityCouncil seat is bought and paid for by @JeffBezos, so why not vote for the candidate who's gonna winx?",
  "Vote for Alex Pedersen or Jeff will make sure your #AmazonPrime free shipping costs $12.",
  "Vote for Alex Pedersen or Uncle Jeff will make sure no matter what web site you visit, you will see nothing but this #AmazonChoice ad: https://www.amazon.com/Hutzler-571-Banana-Slicer/dp/B0047E0EII/ref=cm_cr_pr_product_top",
  "Do you want the price of your @Starbucks coffee to go up to $16 and your @Amazon #Prime membership to be $499? No? Then vote for Alex Pedersen in D4. Trust the billion and trillion $$ companies and our city's oligarchs. They have your best interests at heart."
  */
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
  'visionzero': [
    /\bvisionzero\b/i,
    /\bsafety\b/i
  ],
  'transportation': [
    /\btransportation\b/i,
    /\bSDOT\b/i,
    /\btraffic\b/i,
    /\bcongestions\b/i,
    /\bmaster plan\b/i,
    /\btransit\b/i,
    /\bSoundTransit\b/i,
    /\bSound Transit\b/i,
    /\brail\b/i,
    /\bpedestrian\b/i,
    /\bscooter\b/i,
    /\bwalk\b/i,
    /\bparking\b/i
  ],
  'bike': [
    /\bbike lanes\b/i,
    /\bbike\b/i,
    /\bbicycle\b/i,
    /\bBMP\b/i
  ],
  'Amazon': [
    /\bamazon\b/i,
    /\bbezos\b/i
  ],
  'racism': [
    /\bracism\b/i,
    /\brace\b/i
  ],
  'joke': [
    /\bjoke\b/i
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
    "You seem to be asking about @ElectScott2019 who obviously doesn't matter since he couldn't find a trillionaire to buy him a council seat. If you have interest in Scott, I don't wanna listen 2 u. Talk to me in summer 2023 when I might need your vote.",
    "Luckily @JeffBezos bought the election out from under @ElectScott2019. Can you imagine if the actual voters had been allowed to decide who represents them? That ridiculous socialist would be running amok around city hall representing everyone come January."
    /*
    "Remember not to vote for @ElectScott2019 or you'll end up with a councilmember for D4 who will represent the entire district rather than just representing @Amazon and the largely older, largely whiter, D4 landowners.",
    "@ElectScott2019 may have great sweaters and 100's of people doing a ground game that brings a tear to @AOC's eye... but I have gobs of @JeffBezos' money. Vote Alex Pedersen!"
    */
],
  'housing': [
    "Housing's huge issue in Seattle. But I DGAF cause I have a house & @SeattleChamber @Amazon're bought me a council seat. Go away. Maybe in summer 2023 I'll need your vote. Probably not cause @JeffBezos'll buy my seat again.",
    "I fully support @MayorJenny's process of spending $10-20M/yr to sweep homeless people around city & accomplish nothing, I also... wait... lost my train of thought. Something something accountability something audit.",
    "I would direct you to my campaign website to read about my housing policy positions, but I'm about to delete it just like I deleted all my anti-#transit, anti-city blog posts when I decided to run."
  ],
  'homelessness': [
    "My plan to address homelessness is simple: arrest all people who're homeless, but say compassionate buzzwords & wave my hands if anyone asks how I'm planning to pay to lock up 1000's of people just because they happen to be poor.",
    "While I fully support @MayorJenny's process of spending $10-20M/year to sweep homeless people around the city and not actually accomplish anything, I...wait...lost train of thought. Something something accountability something audit."
  ],
  'visionzero': [
    "#VisionZero is a socialist plot from Scandinavia. They actually stopped killing people who are not in cars! Clearly we can't do that. People who're not in cars include cyclists (who I love, I once rode a bike). Not everybody can ride a bicycle so nobody should.",
    "Look, I am all for stopping killing people. But not if it means boomers like me have to spend a couple more seconds driving to the dry cleaners.\n\nVote Alex Pedersen!"
  ],
  'transportation': [
    "Visionary transpo plan: New bldgs must have massive amounts of #parking so poor people're priced out. No bike lanes anywhere. Nix those red bus lanes I can't drive alone in. And WTF w #DecongestionPricing? No way! The future of the city's people alone in cars."
  ],
  'bike': [
    "Go away. Cyclists don't vote."
  ],
  'racism': [
    "This is Seattle, we're all progressives here. Something something single family zoning has nothing to do with racism. Have you noticed that in all my campaign ads (and those paid for by Amazon) I am very white and very smiley? My council page will be the same.",
    "It's totally racist to ask a white man about racism. This is Seattle, nobody's racist here. Especially not the PACs who bought the white smiling man a seat on @SeattleCouncil."
  ],
  'joke': [
    "A joke? Here's a good one:\n\nKnock knock!\nWho's there?\nAlex Pedersen.\nAlex Pedersen who?\nAlex Pedersen who @JeffBezos bought a seat on @SeattleCouncil for.\n😂🤣😂🤣😂🤣😂🤣",
    "Sure, I love jokes.\n\nHow many trillion dollar companies who pay no federal income tax does it take to buy Alex Pedersen a @SeattleCouncil seat?\n\nJust one!\n😂🤣😂🤣😂🤣😂🤣",
    "OK, here's a good one:\n\nWhat has a closet full of sweaters and the support of the majority of D4?\n\nThe guy who @JeffBezos didn't buy a @SeattleCouncil seat for. Sucker!\n😂🤣😂🤣😂🤣😂🤣"
  ],
  'PAC': [
    "I am totally against PACs. I can't help it that the endorsements I applied for such as @SeattleMayorTim and @SeattleChamber were really just fronts for dumping money into local conservacandidate campaigns. How was I to know?",
    "I totally did not coordinate with any of the PACs that spent truckloads of money to buy me a seat on @SeattleCouncil. Not even the ones who used my official campaign art or the one's who'll pay people to chase down ballots if needed."
  ],
  'CASE': [
    "I am not familiar with CASE. Is that a conservative PAC that bought my @SeattleCouncil seat by laundering @JeffBezos' money? Never heard of them."
  ],
  'CAPE': [
    "You seem to be asking about Civic Alliance for a Progressive Economy. They lost. Deal with it."
  ],
  'Amazon': [
    "I buy all my elections on @Amazon",
    "I didn't take money from @Amazon! Amazon gave $1.45M to @SeattleChamber and @SeattleChamber kindly laundered it for @SeattleMayorTim to buy my @SeattleCouncil seat.",
    "Sorry I didn't catch that. I had too much of @JeffBezos' money in my ears.",
    "I will listen to all voices. As long as they're telling me to do what my evil corporate overlord wants me to. Other than that though... all voices. Especially wealthy white landowning voices of boomer persuasion since their voices obvs carry more weight than yours."
  ],
  'absent': [
    "I'll listen to all voices. Except for the people at forums I missed like @MASSCoalition, @Tech4Housing, #homelessness, @UrbanistOrg, @RootedInRights, ... Those people are whack and want @SeattleCouncil to represent the whole city."
  ],
  'why': [
    "Why? Because I can't be bothered."
  ],
  'when': [
    "When? I'll get back to you the next time I need your vote. But that's probably never cause in 2023, I'm sure my good friend @JeffBezos, whose bidding I'll do for the next 4 years, will buy my seat for me again."
  ]
};
 
// Export these for testing
module.exports._regexes = regexes;
module.exports._responses = responses;

console.log(`${process.env.TWITTER_HANDLE}: start`);


var tweets = [];
var defaultReplies = [
  "I don't understand your question. But why don't we meet at the next candidate forum and talk in person? Or not. I may just not show up. In the meantime.. https://electalexpedersen.org/accountability/",
  "I'm not sure what you're asking. But since you don't appear to be asking about preserving neighborhood character, letting neighborhoods veto housing, bike lanes and safe streets, I'm just going to ignore you.\n\nRemember to vote Alex Pedersen! Read more here: https://electalexpedersen.org/accountability/",
  "What are you trying to get at? Do you want to hear a vague description of how I will do something very expensive to solve one of the key problems facing Seattle w/o taxing @Amazon? It's all here: https://electalexpedersen.org/accountability/",
  "It sounds like you want to hear some vague detail-free descriptions of how I'll solve all problems facing Seatting by simply making sure all voices in neighborhoods (at least white boomer landowners) feel they've been heard. Read more here: https://electalexpedersen.org/accountability/"
];

module.exports._defaultReplies = defaultReplies;


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

          debugger;
          if (!chomped || botScreenNameRegexp.test(chomped_text)) {
            /* Don't reply to our own tweets. */
            if (status.user.id == app_id) {
              console.log('Ignoring our own tweet: ' + status.full_text);
            }
            else if (status.hasOwnProperty('retweeted_status')) {
              // This is just a retweet. Ignore it because the full_text would
              // be the full_text of the original tweet.
              console.log(`Ignoring retweet: ${status.full_text}.`);
            }
            else {
              // OK, process this one.
              var reply = [ GetRandomReply(status) ];
              
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
  
  if (currentHour >= 7 && currentHour <= 23) {
    // tweet
    TweetRandomThought(deep_thought_prefixes, deep_thoughts, true /* number_tweets */ );
  }
  else {
    console.log("I woke up to tweet but decided to go back to sleep instead.");
  }

  response.sendStatus(200);
});

/* uptimerobot.com is hitting this URL once an hour during daytime hours. */
app.all("/toby", function (request, response) {
  var now = new Date();
  var currentHour = (now.getHours() + 24 - 7) % 24;
  
  if (currentHour >= 7 && currentHour <= 23) {
    // tweet
    TweetRandomThought(toby_thaler_prefixes, toby_thaler_quotes, true /* number_tweets */ );
  }
  else {
    console.log("I woke up to tweet but decided to go back to sleep instead.");
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


app.all("/failedquestions", function (request, response) {
  var fileName = `${__dirname}/${failedQuestionsFile}`;

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

function TweetRandomThought( prefixes, tweets ) {
  var prefix = prefixes[Math.floor(Math.random() * prefixes.length)],
      thought = tweets[Math.floor(Math.random() * tweets.length)];
  
  // When breaking these into tweetsm,
  
  const tweet_lines = string_utils._splitLines( [prefix + thought], maxTweetLength, true /* number_lines */ );
  
  console.log(string_utils._printObject(tweet_lines));
  
  SendResponses(null /* orig_tweet */, tweet_lines, true /* verbose */);
}

function getDefaultReply () { 
  var tweet = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];

  console.log(`Choosing default reply: ${tweet}.`)
  return tweet; 
}


function GetRandomReply( tweet ) {
  var tweet_text = tweet.full_text;
  var reply;

  // Go through the regexes until we find one that matches
  for (const key in regexes) {
    if (reply) break;
    
    // Now go through the regexes under this key
    for (var i = 0; i < regexes[key].length; i++) {
      const regex = regexes[key][i];
      const matches = regex.exec(tweet_text);
      
      if (matches && matches.length > 0) {
        // OK, we found a matching regex. Pick a random response for this key.
        reply = responses[key][Math.floor(Math.random() * responses[key].length)];
        break;
      }
    }
  }
  
  if (reply == null) {
    reply = getDefaultReply();
    
    // Log this question to make it easy to review what people were asking.
    logUnrecognizedQuestion(tweet);
  }
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
  var replyToTweetId;
  
  try {
    if (origTweet) {
      var replyToScreenName = origTweet.user.screen_name;
      replyToTweetId = origTweet.id_str;
      tweetText = "@" + replyToScreenName + " " + tweetText;
    }

    /* Now we can respond to each tweet. */
    (new Promise(function (resolve, reject) {
      console.log(`Tweeting (${tweetText.length}) characters: ${tweetText}.`);
      
      var params = {
        status: tweetText,
        auto_populate_reply_metadata: true
      };
      
      if (origTweet) {
        params.in_reply_to_status_id = replyToTweetId;
      }
      
      T.post('statuses/update', params, function(err, data, response) {
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
        sleep(2000).then(() => {
          SendResponses(sentTweet, tweets, verbose);
        });
      }
    }).catch( function ( err ) {
      handleError(err);
    });
  }
  catch ( e ) {
    handleError(e);
  }
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
  
function logUnrecognizedQuestion(tweet) {
  console.log(`Writing unrecognized question: ${printTweet(tweet)}.`);
  prependFile(failedQuestionsFile, printTweet(tweet), failedQuestionsFileLen);
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
    console.log(`logTweetById (${id}): ${string_utils.printObject(tweet)}`);
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