var assert = require('assert');
var server = require('../server');

const user = {
  userName: 'echo',
  avatar: 'echo.png'
};

function createTweet( id = -1, id_str = '', full_text = '', display_text_range = [], screen_name = '' ) {
  let tweet = { id: id, id_str: id_str, full_text: full_text, display_text_range: display_text_range, user: { screen_name: screen_name } };
  
  return tweet;
}

const max_tweet_len = 272;

describe('Response generations', function() {
  describe('empty tweet', function() {
    it('should return the default response', function() {
      const response = server._GetRandomReply(createTweet());
      assert(server._defaultReplies.includes(response));
    });
  });
  describe('tweet asking why', function() {
    it('should not return a default response', function() {
      const response = server._GetRandomReply(createTweet(undefined, undefined, "Hey Alex, why don't you ever show up?"));
      assert(!server._defaultReplies.includes(response));
    });
  });
});

describe('Fidelity of responses', function() {
  describe('empty tweet', function() {
    it('ensure that the keys for the regexes and responses are exactly the same', function() {
      // Check that all keys in regexes are in responses
      for (const key in server._regexes) {
        assert(server._responses.hasOwnProperty(key), `key ${key} is not in responses.`);
      }

      // Check that all keys in responses are in regexes
      for (const key in server._responses) {
        assert(server._regexes.hasOwnProperty(key), `key ${key} is not in regexes.`);
      }
    });
  });
});

describe('Regular expressions', function() {
  describe('Shaun Scott twitter handle', function() {
    it('ensures the regular expression for shaun scott twitter handle works', function() {
      const matches = server._regexes['shaunscott'][0].exec('why should I not vote for @ElectScott2019?')
      
      assert(matches != null);
      assert.equal(matches.length, 1);
    });
  });
});

describe('Tweet correctness', function() {
  describe('tweet length', function() {
    it(`should verify all tweets are under ${max_tweet_len} characters`, function() {
      // Go through all the responses
      for (const key in server._responses) {
        // Now go through the responses under this key
        for (var i = 0; i < server._responses[key].length; i++) {
          var tweet_length = getTweetLength(server._responses[key][i]);
          assert(tweet_length < max_tweet_len);
        }
      }
    });
  });
});

function getTweetLength(tweet_text) {
  var length = tweet_text.length;
  
  debugger;
  
  // find URL's. Every URL onlty takes 23 characters in a tweet.
  var reg = new RegExp(
    "(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,256})([\/\w\.-]?)*\/?",
    "gi");
  
  var result;
  while (result = reg.exec(tweet_text)) {
    var actualUrlLength = result[0].length;
    length = length - actualUrlLength + 23;
  }
  
  console.log(`Length: ${length} for tweet: ${tweet_text}.`);

  return length; 
}