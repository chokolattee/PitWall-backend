const Filter = require('bad-words');

// Custom Tagalog / Filipino bad words
const tagalogBadWords = [
  // Strong profanity
  'putangina', 'putang ina', 'putang-ina', 'puta', 'p.u.t.a',
  'tangina', 'tang ina', 'tang-ina', 'tanga',
  'gago', 'gaga', 'gag0',
  'ulol', 'ul0l',
  'bobo', 'b0b0',
  'tarantado', 'tarantad0',
  'lintik',
  'punyeta',
  'bwisit', 'bwiset',
  'pakyu', 'pak yu', 'pak-yu', 'f*ckyou',
  'leche',
  'hinayupak',
  'hayop ka',
  'animal ka',
  'hudas',
  'pakshet', 'pak shet',
  'syet', 's*et',
  'buset',
  'kupal',
  'inutil',
  'peste',
  'loko', 'loka',
  // Sexual / body-part terms
  'pekpek',
  'tite',
  'bayag',
  'kantot',
  'jakol',
  'bilat',
  'puke',
  'etits',
  'oten',
  'kuching', // slang
  // Common variations / leet-speak
  'put4ngina', 'g4go', 'b0bo', 't4nga',
];

const filter = new Filter();

// Add Tagalog words to the filter
filter.addWords(...tagalogBadWords);

/**
 * Replace any bad/profane words in `text` with asterisks.
 * Returns the cleaned string.
 * @param {string} text
 * @returns {string}
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  try {
    return filter.clean(text);
  } catch (e) {
    // If clean() throws (e.g. on unusual input), return text as-is
    return text;
  }
};

/**
 * Returns true if text contains at least one bad word.
 * @param {string} text
 * @returns {boolean}
 */
const hasBadWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  try {
    return filter.isProfane(text);
  } catch (e) {
    return false;
  }
};

module.exports = { cleanText, hasBadWords, filter };
