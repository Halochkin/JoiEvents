import {MusicModes} from "./MusicModes.js";

function getNoteInteger(node) {
  if (node.body.length === 2) {
    const [l, r] = node.body;
    if (l.type === "absNote" || l.type === "relNote" && Number.isInteger(r))
      return {note: l, num: r};
  }
  return {};
}

function normalizeToAbsolute2(key, relNote) {
  let [absNum, absMode] = key.body;
  let [relNum12, relMode, relNum7] = relNote.body;
  absNum += relNum12;
  if (relNum7)
    absNum += MusicModes.toTwelve(absMode, relNum7);
  if (relMode) {
    const [nextMode, hashes] = MusicModes.switchMode(absMode, relMode);
    absNum += hashes;
    absMode = nextMode;
  }
  return {type: "absNote", body: [absNum, absMode]};
}

function normalizeToAbsolute(note) {
  let [absNum, absMode, relNum12, relNum7, relMode, closed] = note.body;
  if (relNum12 === 0 && relMode === 0 && relNum7 === 0)
    return note;
  //todo I have a problem with ~0 notes as the top note. it will have 0,undefined,0,0,0,0 and it is the same as C0.
  //todo relNum7 should be undefined if not set. A ~0 without a clef should be 48,undefined,0,0,0,0
  //1. eat the relNum12. simply add the rel 12 numbers into the base
  absNum += relNum12;
  //2. eat the relNum7. shift the relative 7 numbers into the base
  if (relNum7) {
    absNum += Math.floor(relNum7 / 7) * 12;
    let next7Num = ((relNum7 % 7) + 7) % 7;
    let distanceTo7Num = MusicModes.getVector(absMode)[next7Num];
    absNum += distanceTo7Num;
  }
  //3. eat the relMode. shift the mode position in the circle of 7 modes, and +1/-1 to the base num every time you pass +7/0.
  if (relMode) {
    const [nextMode, hashes] = MusicModes.switchMode(absMode, relMode);
    absNum += hashes;
    absMode = nextMode;
    // let absModePos = MusicModes.getNumber(absMode);
    // let nextModePos = absModePos + relMode;
    // absNum += Math.floor(nextModePos / 7);
    // nextModePos = ((nextModePos % 7) + 7) % 7;
    // absMode = MusicModes.getName(nextModePos);
  }

  return {type: "Note", body: [absNum, absMode, 0, 0, 0, closed]};
}

// function normalizeToRelative(absNote, pKey, pMode) {
//   let [absNum, absMode] = absNote.body;
//   const shift12 = absNum - pKey;
//   const {seven, twelve} = MusicModes.splitSevenTwelveScale(shift12, pMode);
//   const modeModi = MusicModes.absoluteModeDistance(absMode, pMode);
//   return {type: "Note", body: [0, undefined, twelve, seven, modeModi, 0]};
// }
//
// function getClef(ctx) {
//   for (let i = 0; i < ctx.length; i++) {
//     let scope = ctx[i];
//     if (scope.type === "expFun" && scope.body[0] && scope.body[0].type === "Note")
//       return scope.body[0]
//   }
//   return undefined;
// }
//
// function getNoteIntegerOrModeName(node) {
//   if (node.body.length === 2) {
//     const [l, r] = node.body;
//     if (!(l.type === "relNote" || l.type === "absNote"))
//       return {};
//     if (Number.isInteger(r))
//       return {note: l, value: r};
//     if (MusicModes.isModeName(r.type))
//       return {note: l, value: r.type};
//   }
//   return {};
// }
//
function log2Integer(num) {
  if (num === 0)
    return num;
  if (num > 0 && Number.isInteger(num)) {
    const octave = Math.log2(num);
    if (octave === Math.floor(octave))
      return octave;
  }
  throw new SyntaxError(`Notes can only be multiplied/divided by positive integers in the log2 scale: 1,2,4,8,16,...`);
}

function changeNote(note, steps) {
  if (steps === 0)
    return note;
  const newNote = Object.assign({}, note);
  newNote.body = note.body.slice(0);
  newNote.body[0] += steps;
  return newNote;
}

// function setMode(note, value) {
//   const newNote = Object.assign({}, note);
//   newNote.body = note.body.slice(0);
//   newNote.body[1] = value;
//   return newNote;
// }

//all note operators require the note to be on the left hand side. It will look too complex otherwise.
export const MusicMath = Object.create(null);

//x*y multiply operator
//x*y mathematically is obvious
//and, it can be used on notes too. But, it only works on positive integers in log2 scale 1,2,4,8,16,32, etc = positiveLog2Int.
//x*y absNoteNum means: X is absNoteNum, Y is positiveLog2Int, Y == 1 ? no change : x.noteNum+=12*(log2(y))
//x*y relNote means: X is relNote, Y is positiveLog2Int, Y == 1 ? no change : x.noteNum+=7*(log2(y))
MusicMath["*"] = function (node, ctx) {
  let {note, num} = getNoteInteger(node);
  return note ? changeNote(note, 12 * log2Integer(num)) : node;
};
//x/y divide operator
//x/y mathematically is obvious
//and, it can be used on notes too. But, it only works on positive integers in log2 scale 1,2,4,8,16,32, etc = positiveLog2Int.
//x/y absNoteNum means: X is absNoteNum, Y is positiveLog2Int, Y == 1 ? no change : x.noteNum+=12*(log2(y)) *-1
//x/y relNote means: X is relNote, Y is positiveLog2Int, Y == 1 ? no change : x.noteNum+=7*(log2(y)) *-1
//
//Att!! the multiply and divide operators on notes are very similar, they just go up or down.
MusicMath["/"] = function (node, ctx) {
  let {note, num} = getNoteInteger(node);
  return note ? changeNote(note, -12 * log2Integer(num)) : node;
};

//x+y pluss operator   (and "-"-minus)
//x+y mathematically is obvious
//one might think that it *could* mean:
//x+y absNoteNum means: X is absNoteNum, Y is int, x.noteNum+=y    Att!! This might not be workable.
//x+y relNote means: X is relNote, Y is int, x.relNoteNum+=y

//But. This would yield a dramatically different result if you passed in a note as a frequency number.
//Example:
// Math: 440+1=441                        (freq 441)
// AbsNote: A4+1=A#4                      (freq 466)
// RelNote (in C4ionian/major): A4+1=B4   (freq 493)
//
//Therefore, +/- doesn't work on notes. It will cause a syntax error.
//Instead, there are is another operator that works the same for all three: ^+ (and ^-).

MusicMath["+"] = MusicMath["-"] = function (node, ctx) {
  let [l, r] = node.body;
  if (l.type === "relNote" || r.type === "relNote" || l.type === "absNote" || r.type === "absNote")
    throw new SyntaxError("Notes cannot be added or subtracted. Use the ^+ or ^- or ~ to do note step operations.");
};

//x^+y absolute tone step. (and ^-)
//x^+y mathematically means: X is num, Y is num, x*=2^(y/12)  or  x*= Math.pow(2, y/12)
//x^+y absNoteNum means: X is absNoteNum, Y is int, x.noteNum+=y
//x^+y relNote means: X is relNote, Y is int, x.relNoteAUGMENT+=y
// These operations will yield the same outcome.
// Math: 440^+1=441                        (freq 466)
// AbsNote: A4^+1=A#4                      (freq 466)
// RelNote (in C4ionian/major): A4^+1=A#4  (freq 466)

MusicMath["^+"] = function (node, ctx) {
  const {note, num} = getNoteInteger(node);
  return note ? changeNote(note, num) : node;
};

MusicMath["^-"] = function (node, ctx) {
  const {note, num} = getNoteInteger(node);
  return note ? changeNote(note, -num) : node;
};

//x^^y octave operator.
//x^^y mathematically means: X is num, Y is num, x*=2^y. This is done in LibMath
//x^^y absNoteNum means: X is absNoteNum, Y is int, x+=12*y
//x^^y relNote means: X is relNote, Y is int, x.relNoteNum += (7*y)

MusicMath["^^"] = function (node, ctx) {
  const {note, num} = getNoteInteger(node);
  return note ? changeNote(note, 12 * num) : node;
};

//% mode operator.
//x%y mathematically means modulus remainder. This operator is not semantically related to the %-mode operator for tones.
//x%y Note
//   X is Note, Y is a modeName ("lyd", "dor", "maj", "min", etc.) => will set the absolute modename for a tone
//   X is Note, Y is an int => increments the relative modeModi
//
//the % mode operator is useful for clef Tones. It has no effect when performed on leaf Tones, as leaf nodes will
//always use the parent clef tone's mode, never its own.

MusicMath["%"] = function (node, ctx) {
  // let {note, value} = getNoteIntegerOrModeName(node);
  let {note, num} = getNoteInteger(node);
  if (!note)
    return node;
  if (note.type === "absNote") {
    // if (typeof value === "string")
    //   return setMode(note, value);        //%name, sets the name of the mode and null out any mode changes.
    const [nextMode, hashes] = MusicModes.switchMode(note.body[1], num);
    const clone = Object.assign({}, note);
    clone.body = clone.body.slice();
    clone.body[0] += hashes;
    clone.body[1] = nextMode;
    return clone;
  } else if (note.type === "relNote") {
    const newNote = Object.assign({}, note);
    newNote.body = note.body.slice(0);
    newNote.body[1] += num;
    return newNote;
  }
};

//! close operator
//When used as a prefix on an absNote, the ! "closes" the note.
//A closed note is a note that will not be transformed by a parent clef, neither key nor mode.

MusicMath["!"] = function (node, ctx) {
  let [nothing, note] = node.body;
  if (nothing !== undefined || !note)
    return node;
  if (note.type === "Note")
    return {type: "absNote", body: [note.body[0], note.body[1] || ctx[ctx.length - 1].key.body[1]]};
  if (note.type === "relNote")
    return normalizeToAbsolute2(ctx[0].key, note);
  return node;
};

// function mergeRelativeNodes(key, note) {
//   const rel12 = key[2] + note[2];
//   const rel7 = key[3] + note[3];
//   const modeModi = MusicModes.mergeModes(key[4], note[4]);
//   return [0, undefined, rel12, rel7, modeModi];
// }
// function isRawClef(scope) {
//   if (scope.type === "DOCUMENT")
//     return true;
//   if (scope.type !== "expFun" || !scope.body[0])
//     return false;
//   return scope.body[0].type === "relNote" || scope.body[0].type === "absNote";
// }

function findNearestAbsoluteClef(ctx) {
  for (let scope of ctx) {
    const key = scope.key || scope.body[0];
    if (key && key.type === "absNote")
      return key;
    if (key && key.type === "!")
      return ctx[0].key;
  }
}

// function getAbsoluteToneKeyMode(ctx) {
//   ctx = ctx.filter(scope => isRawClef(scope)).reverse();
//   let res = [undefined, undefined];
//   for (let scope of ctx) {
//     const key = scope.key || scope.body[0];
//     if (key.type === "absNote") {
//       res[0] = key.body[0];
//       res[1] = key.body[1];
//     } else {
//       res[0] += key.body[0];
//       res[0] += MusicModes.toTwelve(res[1], key.body[2]);
//       const [nextMode, hashes] = MusicModes.switchMode(res[1], key.body[1]);
//       res[1] = nextMode;
//       res[0] += hashes;
//     }
//   }
//   return {type: "absNote", body: res};
// }
//
function computeRelativeSubtracts(ctx) {
  let res = [0, 0, 0];
  for (let scope of ctx) {
    const key = scope.key || scope.body[0];
    if (!key)
      continue;
    if (key.type === "absNote")
      return res;
    if (key.type === "relNote") {
      res[0] += key.body[0];
      res[1] += key.body[1];
      res[2] += key.body[2];
    }
  }
  throw new Error("omg");
}

MusicMath["Note"] = function (node, ctx) {
  if (ctx[0].type === "!")                 //if it is a child of "!" close opertor, process under "!"
    return node;
  // const key = getAbsoluteToneKeyMode(ctx);
  const key = findNearestAbsoluteClef(ctx);
  const num12 = node.body[0] - key.body[0];
  let modeModi = MusicModes.absoluteModeDistance(key.body[1], node.body[1]);
  let {seven, twelve} = MusicModes.splitSevenTwelveScale(num12, key.body[1]);
  const relativeSubtracts = computeRelativeSubtracts(ctx);
  twelve -= relativeSubtracts[0];
  modeModi -= relativeSubtracts[1];
  seven -= relativeSubtracts[2];
  return {type: "relNote", body: [twelve, modeModi, seven]};
};

MusicMath["expFun"] = function (node, ctx) {
  const [key, ...body] = node.body;
  return key.type === "relNote" || key.type === "absNote" ?
    {type: "clef", key, body} :
    node;
};

MusicMath["~"] = function (node, ctx) {
  const [l, r] = node.body;
  if (!Number.isInteger(r))
    throw new SyntaxError("The 7scale operator '~' must have an integer on its right side.");
  //todo handle # and b augment and diminish values for '~'
  if (l === undefined) //prefix
    return {type: "relNote", body: [0, 0, r]};
  if (!l.type)
    throw new SyntaxError("The 7scale operator '~' must be performed on a relative or absolute note.");
  if (l.type === "absNote") {
    const clone = Object.assign({}, l);
    clone.body[0] += MusicModes.toTwelve(clone.body[1], r);
    return clone;
  }
  if (l.type === "relNote") {
    const clone = Object.assign({}, l);
    clone.body[2] += r;
    return clone;
  }
  throw new SyntaxError("The 7scale operator '~' must be performed on a relative or absolute note.");
};


//what is the circle 5 point? 7/12scale abs and 4/7scale
//x^/y circle5 operator.
//x^/y mathematically means: X is num, Y is num, x*=(2^(1/12))^y  or  x*= Math.pow(Math.pow(2, 1/12), y))
//x^/y absNoteNum means: X is absNoteNum, Y is int, x.noteNum+=7*y    Att!! This does not fit with all 7scale modes.
//x^/y relNote means: X is relNote, Y is int, x.relNoteNum += (4*y)

// MusicMath["^/"] = function (node, ctx) {
//   const {note, num} = getNoteInteger(node);
//   if (!note)
//     return node;
//   if (num === 0)
//     return note;
//   const scaleType = note.type === "Note" ? 7 : 4;
//   return changeNote(note, scaleType * num);
// };