// % modulo operator would be interpreted as a step in the mode shifts.
// If it comes within a tone description, then it would set the mode.
// If a mode is set, then all notes below can be interpreted in the scale of 7 to this modeKey.
// If no mode is set, then we cannot, we let the tones remain in the scale of 12? or do we substitute in the major scale?
//if a mode is set above another mode, that means that the tones below should be trasnposed into that upper mode.
// that means that the mode is 0-nulled out. made into a relative mode with 0 steps.
// if a mode is to remain, that is, it is intended to overwrite the upper/main mode of the musical sequence, then
// it should have a %! prefix. How this should be implemented technically, I don't see right now.

const tokens = [
  /!?([a-gA-G][#b]?)(\d+)?(?![_a-zA-Z\d#-])/,//absolute notes: Fb, C#4, a4, a4, a0, ab, G, aB10 (not notes a-2, abb4, f##, f#b, A+3)
  /~~([+-]?\d+)/,                            //relative 12 notes: ~~1, ~~0, ~~6, ~~-2, ~~10, ~~-11
  /~([+-]?\d+)([#b]?)/,                      //relative 7 notes: ~1, ~0b, ~6#, ~-2, ~10b, ~-11b
  /~([a-gA-G][#b]?)([+-]?\d+)?/,             //relative alpha notes: ~C, ~C1, ~C0, ~C-2, ~C+2
  // /%(lyd|ion|dor|phryg|mixolyd|locr)(?:ian)/,//mode and modulo syntax
  /[_a-zA-Z][_a-zA-Z\d#-]*/,                 //word:
  /--[_a-zA-Z][_a-zA-Z-]*/,                  //cssVariable:
  /\$[\d]+/,                                 //dollarVariable:
  /(-?(?:\d*\.\d+|\d+)(?:[Ee][+-]?\d+)?)([a-zA-Z]*)/,     //number: //unit can only be latin letters
  /[(),[\]]/,                                //bracket operators:
  /\^\*|\^\^|\^~|[~|>:+*/%^-]/,              //other operators:
  /"((?:\\\\|\\"|[^"]|\.)*)"/,               //doubleQuote
  /'((?:\\\\|\\'|[^']|\.)*)'/,               //singleQuote
  /\s+/,                                     //whitespace
  /.+/                                       //error:
];

//speedup: inline in production
const tokenizer = new RegExp(tokens.map(rx => "(" + rx.source + ")").join("|"), "g");

function tokenize(str) {
  const tokens = [];
  for (let array1; (array1 = tokenizer.exec(str)) !== null;)
    tokens.push(array1);
  return tokens.filter(t => !t[24]);  //whitespace is definitively meaningless now
  // todo this causes a bug in the --css-var special case handling
}

function nextToken(tokens) {
  if (!tokens.length)
    return undefined;
  if (tokens[0][25])
    throw new SyntaxError("InfiniteSound: Illegal token: " + tokens[0][0]);
  return tokens.shift();
}

function parseBlock(tokens) {
  let args = parseGroupArray(tokens, "(", ")");
  if (!args)
    return;
  if (args.length > 1)             //todo separate for add test for this bug
    throw new SyntaxError("(block, with, comma, is, not, allowed)");
  // if (args.length === 0)           //todo add test for empty block
  //   return undefined;
  return args[0];
}

function parseNode(tokens) {
  if (!tokens[0])
    return;
  return parseBlock(tokens) ||
    parseGroupArray(tokens, "[", "]") ||
    parseUnit(tokens);
}

function parseGroupArray(tokens, start, end) {
  if (tokens[0][0] !== start)
    return;
  nextToken(tokens); //eat ( [
  const res = [];
  let previous = start;
  // let primitive = true;
  while (true) {
    if (!tokens[0])
      throw new SyntaxError(`Forgot to close ${start}-block.`);
    if (tokens[0][0] === end) {
      nextToken(tokens);    //eat ] )
      // if (primitive)
      //   res.isPrimitive = 1;
      if (previous === ",")
        res.push(undefined);
      return res;
    }
    if (tokens[0][0] === ",") {
      if (previous === "," || previous === start)
        res.push(undefined);
      previous = ",";
      nextToken(tokens);    //eat ,
      continue;
    }
    if (previous !== "," && previous !== start)
      throw new SyntaxError("Forgot ',' or '" + end + "' after: " + previous);
    res.push(previous = parseExpressions(tokens));
    if (!isPrimitive(previous))
      res.isDirty = 1;
  }
}

function parseOperator(tokens) {
  //isNegativeNumber: <number><negativeNumber> that should have been <number><minus-operator><positiveNumber>
  if (!tokens[0])
    return;
  if (tokens[0][15] && tokens[0][15].startsWith("-")) {
    tokens[0][0] = tokens[0][0].substr(1);
    tokens[0][15] = tokens[0][15].substr(1);
    tokens[0][16] = tokens[0][16].substr(1);
    return "-";
  }
  //!isOperator
  if (tokens[0][19])
    return nextToken(tokens)[0];
}

//todo make a full operator priority table
const priTable = {"|": 1000000, ">": 100000, "+": 100, "-": 100, "*": 10, "/": 10, ":": 1};

function sortOperators(nodeOpNode) {
  while (nodeOpNode.length > 1) {
    let min = Number.MAX_VALUE, I = 1;
    for (let i = 1; i < nodeOpNode.length; i += 2) {
      let op = nodeOpNode[i];
      let pri = priTable[op] || Number.MAX_VALUE;
      if (min > pri) {
        min = pri;
        I = i;
      }
    }
    let node = {type: nodeOpNode[I], body: [nodeOpNode[I - 1], nodeOpNode[I + 1]]};
    if (!isPrimitive(node.body[0]) || !isPrimitive(node.body[1]))
      node.body.isDirty = 1;
    nodeOpNode.splice(I - 1, 3, node);
  }
  return nodeOpNode[0];
}

function parseExpressions(tokens) {
  const nodeOps = [parseNode(tokens)];
  let op;
  while (op = parseOperator(tokens)) {
    nodeOps.push(op);
    nodeOps.push(parseNode(tokens));
  }
  return sortOperators(nodeOps);
}

function parseUnit(tokens) {
  return parseFunction(tokens) || parsePrimitive(tokens);
}

const absScale12 = {
  "c": 0,
  "c#": 1,
  "db": 1,
  "d": 2,
  "d#": 3,
  "eb": 3,
  "e": 4,
  "f": 5,
  "f#": 6,
  "gb": 6,
  "g": 7,
  "g#": 8,
  "ab": 8,
  "a": 9,
  "a#": 10,
  "bb": 10,
  "b": 11
};

/**
 * all function names are toLowerCase().
 * default octave for absolute tones is 4.
 */
function parseFunctionName(t) {
  const type = t[0].toLowerCase();
  if (t[1]) {
    const tone = t[2].toLowerCase();
    const num = absScale12[tone];
    const octave = t[3] ? parseInt(t[3]) : 4;
    const frozen = type[0] === "!" ? 1 : 0;
    return {type: "absNote", tone: type, num, octave, frozen};
  } else if (t[4]) {                                        //relative 12 tones
    return {type: "~~", num: parseInt(t[5])}
  } else if (t[6]) {                                        //relative 7 tones
    return {
      type: "~",
      num: parseInt(t[7]),
      augment: t[8] === "#" ? 1 : t[8] === "b" ? -1 : 0,
      body: []
    };
  }
  //todo modes in addition to the key, so that we can have ~7 notes
  if (t[9]) {                                               //relative alpha tone
    const tone = t[10].toLowerCase();
    return {
      type: "relNote",
      tone,
      num: absScale12[tone],
      octave: parseInt(t[11]) || 0,
      body: []
    };
  }
  return {type};
}

function parseFunction(tokens) {
  const t = tokens[0];
  if (!(t[1] || t[4] || t[6] || t[9] || t[12] || t[13] || t[14]))
    return;
  const fun = parseFunctionName(nextToken(tokens));
  fun.body = !tokens[0] ? [] : parseGroupArray(tokens, "(", ")") || [];       //todo isDirty is here
  return fun;
}

function parsePrimitive(tokens) {
  const lookAhead = tokens[0];
  if (lookAhead[22])  //singleQuote
    return nextToken(tokens)[23];
  if (lookAhead[20])  //doubleQuote
    return nextToken(tokens)[21];
  if (lookAhead[15]) {  //number
    let t = nextToken(tokens);
    const num = parseFloat(t[16]);
    let type = t[17].toLowerCase();                  //turn UpperCase characters in unit names toLowerCase().
    return type === "" ? num : {type, body: [num]};
  }
}

export function isPrimitive(node) {
  return node === undefined ||
    typeof node === "number" ||
    typeof node === "string" ||
    (node instanceof Array && !node.isDirty);
}

export function parse(str) {
  const tokens = tokenize(str);
  let args = parseExpressions(tokens);
  if (tokens.length)
    throw new SyntaxError("the main css audio pipe is broken");
  return args;
}