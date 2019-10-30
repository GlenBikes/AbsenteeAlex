var assert = require('assert');
var server = require('../server');

const user = {
  userName: 'echo',
  avatar: 'echo.png'
};

const createTweet = ({
  id = -1,
  id_str = '',
  full_text = 'Default tweet.',
  display_text_range = []
}) => ({
  id,
  id_str,
  full_text,
  display_text_range
});

describe('Response generations', function() {
  describe('empty tweet', function() {
    it('should return the default response', function() {
      const response = server._GetRandomReply('');
      assert.equal(response, server._defaultReply());
    });
  });
  describe('tweet asking why', function() {
    it('should not return the default response', function() {
      const response = server._GetRandomReply("Hey Alex, why don't you ever show up?");
      assert.notEqual(response, server._defaultReply());
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
