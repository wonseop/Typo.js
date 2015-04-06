( function ( window ) {
	'use strict';

/**
 * Typo is a JavaScript implementation of a spellchecker using hunspell-style
 * dictionaries.
 */

/**
 * Typo constructor.
 *
 * @param {String} [dictionary] The locale code of the dictionary being used. e.g.,
 *                              "en_US". This is only used to auto-load dictionaries.
 * @param {String} [affData] The data from the dictionary's .aff file. If omitted
 *                           and the first argument is supplied, in "chrome" platform,
 *                           the .aff file will be loaded automatically from
 *                           lib/typo/dictionaries/[dictionary]/[dictionary].aff
 *                           In other platform, it will be loaded from
 *                           [setting.path]/dictionaries/[dictionary]/[dictionary].aff
 * @param {String} [wordsData] The data from the dictionary's .dic file. If omitted,
 *                           and the first argument is supplied, in "chrome" platform,
 *                           the .dic file will be loaded automatically from
 *                           lib/typo/dictionaries/[dictionary]/[dictionary].dic
 *                           In other platform, it will be loaded from
 *                           [setting.path]/dictionaries/[dictionary]/[dictionary].dic
 * @param {Object} [settings] Constructor settings. Available properties are:
 *                            {String} [platform]: "chrome" for Chrome Extension or other
 *                              value for the usual web.
 *                            {String} [path]: path to load dictionary from in non-chrome
 *                              environment.
 *                            {Object} [flags]: flag information.
 *
 *
 * @returns {Typo} A Typo object.
 */

	var Typo = function ( dictionary, affData, wordsData, settings ) {
		var i, _len, j, _jlen, rule, path, ruleText, expressionText, character;

		settings = settings || {};

		/** Determines the method used for auto-loading .aff and .dic files. **/
		this.dictionary = null;
		this.rules = {};
		this.dictionaryTable = {};
		this.compoundRules = [];
		this.compoundRuleCodes = {};
		this.replacementTable = [];
		this.flags = settings.flags || {};

		if ( dictionary ) {
			this.dictionary = dictionary;

			path = settings.dictionaryPath || '';
			affData = affData || this._readFile( path + "/" + dictionary + "/" + dictionary + ".aff", settings.charset );
			wordsData = wordsData || this._readFile( path + "/" + dictionary + "/" + dictionary + ".dic", settings.charset );

			this.rules = this._parseAFF(affData);

			// Save the rule codes that are used in compound rules.
			this.compoundRuleCodes = {};

			for ( i = 0, _len = this.compoundRules.length; i < _len; i++ ) {
				rule = this.compoundRules[i];
				
				for ( j = 0, _jlen = rule.length; j < _jlen; j++ ) {
					this.compoundRuleCodes[rule[j]] = [];
				}
			}

			// If we add this ONLYINCOMPOUND flag to this.compoundRuleCodes, then _parseDIC
			// will do the work of saving the list of words that are compound-only.
			if ( "ONLYINCOMPOUND" in this.flags ) {
				this.compoundRuleCodes[this.flags.ONLYINCOMPOUND] = [];
			}

			this.dictionaryTable = this._parseDIC(wordsData);

			// Get rid of any codes from the compound rule codes that are never used
			// (or that were special regex characters).  Not especially necessary...
			for ( i in this.compoundRuleCodes ) {
				if ( this.compoundRuleCodes[i].length === 0 ) {
					delete this.compoundRuleCodes[i];
				}
			}

			// Build the full regular expressions for each compound rule.
			// I have a feeling (but no confirmation yet) that this method of
			// testing for compound words is probably slow.
			for ( i = 0, _len = this.compoundRules.length; i < _len; i++ ) {
				ruleText = this.compoundRules[i];

				expressionText = "";

				_jlen = ruleText.length;
				for ( j = 0; j < _jlen; j++ ) {
					character = ruleText[j];

					if ( character in this.compoundRuleCodes ) {
						expressionText += "(" + this.compoundRuleCodes[character].join( "|" ) + ")";
					} else {
						expressionText += character;
					}
				}

				this.compoundRules[i] = new RegExp( expressionText, "i" );
			}
		}

		return this;
	};

	function isHangul( charCode ) {
		return ( charCode >= 0xAC00 ) && ( charCode <= 0xD7AF );
	}

	function disassembleHangle( string ) {
		var i, length, temp, cho, jung, jong,
			rCho = [
				"ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
				"ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
			],
			rJung = [
				"ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
				"ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ",
				"ㅣ"
			],
			rJong = [
				"", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
				"ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
				"ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
			],
			morphemes = [];

		length = string.length;

		for ( i = 0; i < length; i++ ) {
			temp = string.charCodeAt( i );

			if ( !isHangul( temp ) ) {
				continue;
			}

			temp -= 0xAC00;
			jong = temp % 28;								// 종성
			jung = ( ( temp - jong ) / 28 ) % 21;			// 중성
			cho = ( ( ( temp - jong ) / 28 ) - jung ) / 21;	// 종성

			morphemes.push( String.fromCharCode( 0x1100 + cho ) );
			morphemes.push( String.fromCharCode( 0x1161 + jung ) );

			if ( jong ) {
				morphemes.push( String.fromCharCode( 0x11A7 + jong ) );
			}
		}

		return morphemes.join( "" );
	}

	Typo.prototype = {
		/**
		 * Loads a Typo instance from a hash of all of the Typo properties.
		 *
		 * @param object obj A hash of Typo properties, probably gotten from a JSON.parse(JSON.stringify(typo_instance)).
		 */
		load: function ( obj ) {
			var i;

			for ( i in obj ) {
				this[i] = obj[i];
			}
			
			return this;
		},

		/**
		 * Read the contents of a file.
		 *
		 * @param {String} path The path (relative) to the file.
		 * @param {String} [charset="ISO8859-1"] The expected charset of the file
		 * @returns string The file data.
		 */
		_readFile: function ( path, charset ) {
			var xhr,
				result = "",
				isIE = "ActiveXObject" in window,
				href = window.location.href;

			path = isIE ? href.substring(0, href.lastIndexOf('/')) + "/" + path : path;

			try {
				xhr = isIE ? new window.ActiveXObject("MSXML2.XMLHTTP") : new XMLHttpRequest();
				xhr.open( "GET", path, false );

				if ( xhr.overrideMimeType ) {
					xhr.overrideMimeType("text/plain; charset=" + ( charset || "ISO8859-1" ) );
				}

				xhr.send( null );

				result = xhr.responseText;
			} catch ( e ) {
				alert("Error: Can't read a file! \n" +
					"supportActiveX: " + isIE + "\n" +
					"Path: " + path + "\n" +
					"Message: " + e.message );
			}

			return result;
		},

		/**
		 * Parse the rules out from a .aff file.
		 *
		 * @param {String} data The contents of the affix file.
		 * @returns object The rules from the file.
		 */
		_parseAFF: function ( data ) {
			var i, _len, j, _jlen, lines, line, definitionParts,
				rules, ruleType, ruleCode, combineable, numEntries, entries,
				lineParts, charactersToRemove, additionParts, charactersToAdd, continuationClasses, regexToMatch, entry;

			rules = {};

			// Remove comment lines
			data = this._removeAffixComments(data);

			lines = data.split("\n");

			for ( i = 0, _len = lines.length; i < _len; i++ ) {
				line = lines[i];

				definitionParts = line.split( /\s+/ );

				ruleType = definitionParts[0];

				if ( ruleType === "PFX" || ruleType === "SFX" ) {
					ruleCode = definitionParts[1];
					combineable = definitionParts[2];
					numEntries = parseInt(definitionParts[3], 10);
					entries = [];

					for ( j = i + 1, _jlen = i + 1 + numEntries; j < _jlen; j++ ) {
						line = lines[j];

						lineParts = line.split(/\s+/);
						charactersToRemove = lineParts[2];

						additionParts = lineParts[3].split("/");

						charactersToAdd = additionParts[0];
						if (charactersToAdd === "0") {
							charactersToAdd = "";
						}

						continuationClasses = this.parseRuleCodes(additionParts[1]);

						regexToMatch = lineParts[4];

						entry = {};
						entry.add = charactersToAdd;

						if ( continuationClasses.length > 0 ) {
							entry.continuationClasses = continuationClasses;
						}

						if ( regexToMatch !== "." ) {
							entry.match = ( ruleType === "SFX" ) ? new RegExp(regexToMatch + "$") : new RegExp("^" + regexToMatch);
						}

						if ( charactersToRemove !== "0" ) {
							entry.remove = (ruleType === "SFX") ? new RegExp(charactersToRemove  + "$") : charactersToRemove;
						}

						entries.push(entry);
					}

					rules[ruleCode] = { "type" : ruleType, "combineable" : (combineable == "Y"), "entries" : entries };

					i += numEntries;
				} else if (ruleType === "COMPOUNDRULE") {
					numEntries = parseInt(definitionParts[1], 10);

					for ( j = i + 1, _jlen = i + 1 + numEntries; j < _jlen; j++ ) {
						line = lines[j];

						lineParts = line.split(/\s+/);
						this.compoundRules.push(lineParts[1]);
					}

					i += numEntries;
				} else if (ruleType === "REP") {
					lineParts = line.split(/\s+/);

					if (lineParts.length === 3) {
						this.replacementTable.push([ lineParts[1], lineParts[2] ]);
					}
				} else if ( ruleType === "ICONV" || ruleType === "OCONV" ) {
					if (!this[ruleType]) {
						this[ruleType] = {};
					}
					if (definitionParts[2]) {
						this[ruleType][definitionParts[1]] = definitionParts[2];
					}
				} else if ( ruleType === "TRY" ) {
					this.alphabet = definitionParts[1];
				} else {
					// ONLYINCOMPOUND
					// COMPOUNDMIN
					// FLAG
					// KEEPCASE
					// NEEDAFFIX

					this.flags[ruleType] = definitionParts[1];
				}
			}

			return rules;
		},

		/**
		 * Removes comment lines and then cleans up blank lines and trailing whitespace.
		 *
		 * @param {String} data The data from an affix file.
		 * @return {String} The cleaned-up data.
		 */
		_removeAffixComments: function ( data ) {
			// Remove comments
			data = data.replace(/#.*$/mg, "");

			// Trim each line
			data = data.replace(/^\s\s*/m, '').replace(/\s\s*$/m, '');

			// Remove blank lines.
			data = data.replace(/\n{2,}/g, "\n");

			// Trim the entire string
			data = data.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

			return data;
		},

		/**
		 * Parses the words out from the .dic file.
		 *
		 * @param {String} data The data from the dictionary file.
		 * @returns object The lookup table containing all of the words and
		 *                 word forms from the dictionary.
		 */
		_parseDIC: function ( data ) {
			var i, _len, j, _jlen, ii, _iilen, k, iii, _iiilen, lines, line, code, rule, newWord,
				dictionaryTable, parts, word, ruleCodesArray, newWords, combineCode, combineRule, otherNewWord, otherNewWords;

			data = this._removeDicComments( data );

			lines = data.split( "\n" );
			dictionaryTable = {};

			function addWord( word, rules ) {
				// Some dictionaries will list the same word multiple times with different rule sets.
				if ( !( word in dictionaryTable ) || typeof dictionaryTable[word] !== 'object' ) {
					dictionaryTable[word] = [];
				}

				dictionaryTable[word].push(rules);
			}

			// The first line is the number of words in the dictionary.
			for ( i = 1, _len = lines.length; i < _len; i++ ) {
				line = lines[i];
				parts = line.split("/", 2);
				word = parts[0];

				// Now for each affix rule, generate that form of the word.
				if ( parts.length > 1 ) {
					ruleCodesArray = this.parseRuleCodes(parts[1]);

					// Save the ruleCodes for compound word situations.
					if ( !("NEEDAFFIX" in this.flags) || ruleCodesArray.indexOf(this.flags.NEEDAFFIX) === -1 ) {
						addWord(word, ruleCodesArray);
					}

					for ( j = 0, _jlen = ruleCodesArray.length; j < _jlen; j++ ) {
						code = ruleCodesArray[j];

						rule = this.rules[code];

						if ( rule ) {
							newWords = this._applyRule(word, rule);

							for ( ii = 0, _iilen = newWords.length; ii < _iilen; ii++ ) {
								newWord = newWords[ii];

								addWord( newWord, [] );

								if (rule.combineable) {
									for ( k = j + 1; k < _jlen; k++ ) {
										combineCode = ruleCodesArray[k];

										combineRule = this.rules[combineCode];

										if ( combineRule ) {
											if ( combineRule.combineable && ( rule.type !== combineRule.type ) ) {
												otherNewWords = this._applyRule(newWord, combineRule);

												for ( iii = 0, _iiilen = otherNewWords.length; iii < _iiilen; iii++ ) {
													otherNewWord = otherNewWords[iii];
													addWord( otherNewWord, [] );
												}
											}
										}
									}
								}
							}
						}

						if ( code in this.compoundRuleCodes ) {
							this.compoundRuleCodes[code].push( word );
						}
					}
				} else {
					addWord( word, [] );
				}
			}

			return dictionaryTable;
		},

		/**
		 * Removes comment lines and then cleans up blank lines and trailing whitespace.
		 *
		 * @param {String} data The data from a .dic file.
		 * @return {String} The cleaned-up data.
		 */
		_removeDicComments: function ( data ) {
			// I can't find any official documentation on it, but at least the de_DE
			// dictionary uses tab-indented lines as comments.

			// Remove comments
			data = data.replace(/^\t.*$/mg, "");

			return data;
		},

		parseRuleCodes: function ( textCodes ) {
			var i, _len, flags;

			if (!textCodes) {
				return [];
			} else if ( !( "FLAG" in this.flags ) ) {
				return textCodes.split("");
			} else if (this.flags.FLAG === "long") {
				flags = [];

				for ( i = 0, _len = textCodes.length; i < _len; i += 2 ) {
					flags.push( textCodes.substr( i, 2 ) );
				}

				return flags;
			} else if ( this.flags.FLAG === "num" ) {
				return textCodes.split( "," );
			}
		},

		/**
		 * Applies an affix rule to a word.
		 *
		 * @param {String} word The base word.
		 * @param {Object} rule The affix rule.
		 * @returns {String[]} The new words generated by the rule.
		 */
		_applyRule: function ( word, rule ) {
			var i, _len, j, _jlen, entry, newWord, continuationRule,
				entries = rule.entries,
				newWords = [];

			for ( i = 0, _len = entries.length; i < _len; i++ ) {
				entry = entries[i];

				if ( !entry.match || word.match( entry.match ) ) {
					newWord = word;

					if (entry.remove) {
						newWord = newWord.replace(entry.remove, "");
					}

					newWord = (rule.type === "SFX") ? newWord + entry.add : entry.add + newWord;
					newWords.push(newWord);

					if ( "continuationClasses" in entry ) {
						for ( j = 0, _jlen = entry.continuationClasses.length; j < _jlen; j++ ) {
							continuationRule = this.rules[entry.continuationClasses[j]];

							if ( continuationRule ) {
								newWords = newWords.concat(this._applyRule(newWord, continuationRule));
							}
							/*
							else {
								// This shouldn't happen, but it does, at least in the de_DE dictionary.
								// I think the author mistakenly supplied lower-case rule codes instead
								// of upper-case.
							}
							*/
						}
					}
				}
			}

			return newWords;
		},

		/**
		 * Checks whether a word or a capitalization variant exists in the current dictionary.
		 * The word is trimmed and several variations of capitalizations are checked.
		 * If you want to check a word without any changes made to it, call checkExact()
		 *
		 * @see http://blog.stevenlevithan.com/archives/faster-trim-javascript re:trimming function
		 *
		 * @param {String} aWord The word to check.
		 * @returns {Boolean}
		 */
		check: function( aWord ) {
			var trimmedWord;

			// Remove leading and trailing whitespace
			trimmedWord = aWord.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

			if ( this.dictionary === "ko" ) {
				trimmedWord = disassembleHangle( trimmedWord );
			}

			return this._check( trimmedWord );
		},

		_check: function ( trimmedWord ) {
			var capitalizedWord, lowercaseWord;

			if (this.checkExact(trimmedWord)) {
				return true;
			}
			
			// The exact word is not in the dictionary.
			if (trimmedWord.toUpperCase() === trimmedWord) {
				// The word was supplied in all uppercase.
				// Check for a capitalized form of the word.
				capitalizedWord = trimmedWord[0] + trimmedWord.substring(1).toLowerCase();

				if (this.hasFlag(capitalizedWord, "KEEPCASE")) {
					// Capitalization variants are not allowed for this word.
					return false;
				}

				if (this.checkExact(capitalizedWord)) {
					return true;
				}
			}

			lowercaseWord = trimmedWord.toLowerCase();

			if (lowercaseWord !== trimmedWord) {
				if (this.hasFlag(lowercaseWord, "KEEPCASE")) {
					// Capitalization variants are not allowed for this word.
					return false;
				}

				// Check for a lowercase form
				if (this.checkExact(lowercaseWord)) {
					return true;
				}
			}

			return false;
		},

		/**
		 * Checks whether a word exists in the current dictionary.
		 *
		 * @param {String} word The word to check.
		 * @returns {Boolean}
		 */
		checkExact: function ( word ) {
			var i, _len, ruleCodes = this.dictionaryTable[word];

			if ( typeof ruleCodes === 'undefined' ) {
				// Check if this might be a compound word.
				if ("COMPOUNDMIN" in this.flags && word.length >= this.flags.COMPOUNDMIN) {
					for ( i = 0, _len = this.compoundRules.length; i < _len; i++ ) {
						if (word.match(this.compoundRules[i])) {
							return true;
						}
					}
				}

				return false;
			} else {
				for ( i = 0, _len = ruleCodes.length; i < _len; i++ ) {
					if (!this.hasFlag(word, "ONLYINCOMPOUND", ruleCodes[i])) {
						return true;
					}
				}

				return false;
			}
		},

		/**
		 * Looks up whether a given word is flagged with a given flag.
		 *
		 * @param {String} word The word in question.
		 * @param {String} flag The flag in question.
		 * @return {Boolean}
		 */
		hasFlag: function ( word, flag, wordFlags ) {
			if ( flag in this.flags ) {
				if ( typeof wordFlags === 'undefined' ) {
					wordFlags = Array.prototype.concat.apply([], this.dictionaryTable[word]);
				}

				if (wordFlags && wordFlags.indexOf(this.flags[flag]) !== -1) {
					return true;
				}
			}

			return false;
		},

		/**
		 * Returns a list of suggestions for a misspelled word.
		 *
		 * @see http://www.norvig.com/spell-correct.html for the basis of this suggestor.
		 * This suggestor is primitive, but it works.
		 *
		 * @param {String} word The misspelling.
		 * @param {Number} [limit=5] The maximum number of suggestions to return.
		 * @returns {String[]} The array of suggestions.
		 */
		alphabet : "",
		suggest : function ( word, limit ) {
			var self, i, _len, replacementEntry, correctedWord;

			limit = limit || 5;

			// Remove leading and trailing whitespace
			word = word.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

			if ( this.dictionary === "ko" ) {
				word = disassembleHangle( word );
			}

			if ( this._check( word ) ) {
				return [];
			}

			// Check the replacement table.
			for ( i = 0, _len = this.replacementTable.length; i < _len; i++ ) {
				replacementEntry = this.replacementTable[i];

				if ( word.indexOf(replacementEntry[0]) !== -1 ) {
					correctedWord = word.replace( replacementEntry[0], replacementEntry[1] );

					if ( this._check( correctedWord ) ) {
						return [correctedWord];
					}
				}
			}

			self = this;
			//self.alphabet = "abcdefghijklmnopqrstuvwxyz";

			/*
			if (!self.alphabet) {
				// Use the alphabet as implicitly defined by the words in the dictionary.
				var alphaHash = {};
				
				for (var i in self.dictionaryTable) {
					for (var j = 0, _len = i.length; j < _len; j++) {
						alphaHash[i[j]] = true;
					}
				}
				
				for (var i in alphaHash) {
					self.alphabet += i;
				}
				
				var alphaArray = self.alphabet.split("");
				alphaArray.sort();
				self.alphabet = alphaArray.join("");
			}
			*/
			function edits1( words ) {
				var i, _len, ii, _iilen, j, _jlen, s,
					word, splits, deletes, transposes, replaces, inserts,
					rv = [];

				for ( ii = 0, _iilen = words.length; ii < _iilen; ii++ ) {
					word = words[ii];
					splits = [];

					for ( i = 0, _len = word.length + 1; i < _len; i++ ) {
						splits.push( [ word.substring( 0, i ), word.substring(i, word.length) ] );
					}

					deletes = [];
					for ( i = 0, _len = splits.length; i < _len; i++ ) {
						s = splits[i];
						if ( s[1] ) {
							deletes.push( s[0] + s[1].substring( 1 ) );
						}
					}

					transposes = [];

					for ( i = 0, _len = splits.length; i < _len; i++ ) {
						s = splits[i];
						if ( s[1].length > 1 ) {
							transposes.push( s[0] + s[1][1] + s[1][0] + s[1].substring( 2 ) );
						}
					}

					replaces = [];
					for ( i = 0, _len = splits.length; i < _len; i++ ) {
						s = splits[i];
						if (s[1]) {
							for ( j = 0, _jlen = self.alphabet.length; j < _jlen; j++ ) {
								replaces.push(s[0] + self.alphabet[j] + s[1].substring( 1 ) );
							}
						}
					}

					inserts = [];

					for ( i = 0, _len = splits.length; i < _len; i++ ) {
						s = splits[i];
						if ( s[1] ) {
							for ( j = 0, _jlen = self.alphabet.length; j < _jlen; j++ ) {
								replaces.push( s[0] + self.alphabet[j] + s[1] );
							}
						}
					}

					rv = rv.concat( deletes );
					rv = rv.concat( transposes );
					rv = rv.concat( replaces );
					rv = rv.concat( inserts );
				}

				return rv;
			}

			function known( words ) {
				var i, _len, rv = [];

				for ( i = 0, _len = words.length; i < _len; i++) {
					if ( self._check( words[i] ) ) {
						rv.push( words[i] );
					}
				}

				return rv;
			}

			function correct( word ) {
				// Get the edit-distance-1 and edit-distance-2 forms of this word.
				var i, _len, rv, sorted_corrections,
					ed1 = edits1( [word] ),
					ed2 = edits1( ed1 ),
					corrections = known( ed1 ).concat( known( ed2 ) ),

					// Sort the edits based on how many different ways they were created.
					weighted_corrections = {};

				function sorter( a, b ) {
					if ( a[1] < b[1] ) {
						return -1;
					}

					return 1;
				}

				for ( i = 0, _len = corrections.length; i < _len; i++ ) {
					if ( !( corrections[i] in weighted_corrections ) ) {
						weighted_corrections[corrections[i]] = 1;
					} else {
						weighted_corrections[corrections[i]] += 1;
					}
				}

				sorted_corrections = [];

				for ( i in weighted_corrections ) {
					sorted_corrections.push( [ i, weighted_corrections[i] ] );
				}

				sorted_corrections.sort(sorter).reverse();

				rv = [];

				for ( i = 0, _len = Math.min(limit, sorted_corrections.length); i < _len; i++ ) {
					if ( !self.hasFlag( sorted_corrections[i][0], "NOSUGGEST" ) ) {
						rv.push( sorted_corrections[i][0] );
					}
				}

				return rv;
			}

			return correct( word );
		}
	};

	window.Typo = Typo;
} ( window ) );