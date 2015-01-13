function run() {
	var utilityDict = new Typo(),
		affData = utilityDict._readFile( "dictionaries/ko/ko.aff", "UTF-8" ),
		wordData = utilityDict._readFile( "dictionaries/ko/ko.dic", "UTF-8" ),
		hashDict = new Typo( "ko", affData, wordData );

	testDictionary( hashDict );
}

function testDictionary( dict ) {
	test( "Dictionary object attributes are properly set", function() {
		equal( dict.dictionary, "ko" );
	});

	test( "Correct checking of words with affixes", function() {
		equal( dict.check( "가방" ), true, "가방: true" );
		equal( dict.check( "가방이" ), true, "가방이: true" );
		equal( dict.check( "가뱅" ), false, "가뱅: false" );
		equal( dict.check( "따방" ), false, "따방: false" );
		equal( dict.check( "컴퓨터가" ), true, "컴퓨터가: true" );
		equal( dict.check( "컴퓨터이" ), false, "컴퓨터이: false" );
		equal( dict.check( "컴퓨방" ), false, "컴퓨방: false" );
		equal( dict.check( "발로" ), true, "발로: true" );
		equal( dict.check( "발으로" ), false, "발으로: false" );
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "가방" ), [], "가방: []" );
			start();
		}, 1000 );
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "가방이" ), [], "가방이: []" );
			start();
		}, 1000 );
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "가뱅" ), [ "가방" ], "가뱅: [ 가방 ]" );
			start();
		}, 1000 );
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "따방" ), [ "가방" ], "따방: [ 가방 ]" );
			start();
		}, 1000 );
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "컴퓨터가" ), [], "컴퓨터가: []" );
			start();
		}, 1000 );
	});

	// asyncTest( "Replacement rules are implemented", function() {
	// 	setTimeout(function(){
	// 		ddeepEqual( dict.suggest( "컴퓨터이" ), [ "컴퓨터에", "컴퓨터", "컴퓨터가", "컴퓨터로" ], "컴퓨터이: [컴퓨터에, 컴퓨터, 컴퓨터가, 컴퓨터로]" );
	// 		start();
	// 	}, 1000);
	// });

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "발로" ), [], "발: []" );
			start();
		}, 1000);
	});

	asyncTest( "Replacement rules are implemented", function() {
		setTimeout(function(){
			deepEqual( dict.suggest( "발으로" ), [ "발은", "발을", "발로" ], "발으로: [발은, 발을, 발]" );
			start();
		}, 1000);
	});
}

$( document ).ready(function() {
	run();
});