function run() {
	var utilityDict = new Typo();
	var affData = utilityDict._readFile("dictionaries/ko/ko.aff", "UTF-8");
	var wordData = utilityDict._readFile("dictionaries/ko/ko.dic", "UTF-8");
	
	var hashDict = new Typo("ko", affData, wordData);
	testDictionary(hashDict);
}

function testDictionary(dict) {
	test("Dictionary object attributes are properly set", function () {
		equal(dict.dictionary, "ko");
	});

	// console.log(dict.check("가방"));
	console.log(dict.check(Hangul.disassemble( "가방" ).join("")));
	console.log(dict.check(Hangul.disassemble( "가방이" ).join("")));
	console.log(dict.check(Hangul.disassemble( "가뱅" ).join("")));
	// console.log(dict.check("따방"));
	// console.log(dict.check("컴퓨터가"));
	// console.log(dict.check("컴퓨터이"));
	// console.log(dict.check("컴퓨방"));
	// console.log(dict.check("발로"));
	// console.log(dict.check("발으로"));

	// console.log(dict.suggest("가방"));
	console.log(dict.suggest(Hangul.disassemble( "가방" ).join("")));
	console.log(dict.suggest(Hangul.disassemble( "가방이" ).join("")));
	console.log(dict.suggest(Hangul.disassemble( "가뱅" ).join("")));
	// console.log(dict.suggest("따방"));
	// console.log(dict.suggest("컴퓨터가"));
	// console.log(dict.suggest("컴퓨터이"));
	// console.log(dict.suggest("컴퓨방"));
	// console.log(dict.suggest("발로"));
	// console.log(dict.suggest("발으로"));
}

$( document ).ready(function() {
	run();
});