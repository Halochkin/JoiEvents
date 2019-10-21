import {parse} from "../Parser2.js";

describe('keys', function () {
  it("G~C#4", function () {
    const tst = parse("G~C#4");
    const result = {type: "note", tone: "C#", octave: 4};
    expect(tst).to.deep.equal(result);
  });
  it("A5", function () {
    const tst = parse("A5");
    const result = {type: "note", tone: "A", octave: 5};
    expect(tst).to.deep.equal(result);
  });
  it("Bb5", function () {
    const tst = parse("Bb5");
    const result = {type: "note", tone: "Bb", octave: 5};
    expect(tst).to.deep.equal(result);
  });
  it("D#-2", function () {
    const tst = parse("D#-2");
    const result = {type: "note", tone: "D#", octave: -2};
    expect(tst).to.deep.equal(result);
  });
  it("E", function () {
    const tst = parse("E");
    const result = {type: "note", tone: "E", octave: undefined};
    expect(tst).to.deep.equal(result);
  });
  it("f#", function () {
    const tst = parse("f#");
    const result = {type: "note", tone: "F#", octave: undefined};
    expect(tst).to.deep.equal(result);
  });
  it("g0", function () {
    const tst = parse("g0");
    const result = {type: "note", tone: "G", octave: 0};
    expect(tst).to.deep.equal(result);
  });
});

describe('quotes', function () {
  it("'hello world!'", function () {
    const tst = parse("'hello world!'");
    const result = {type: "'", value: "hello world!"};
    expect(tst).to.deep.equal(result);
  });

  it('"hello world!"', function () {
    const tst = parse('"hello world!"');
    const result = {type: '"', value: "hello world!"};
    expect(tst).to.deep.equal(result);
  });

  it('"hello \\\"world!"', function () {
    const tst = parse('"hello \\\"world!"');
    const result = {type: '"', value: "hello \\\"world!"};
    expect(tst).to.deep.equal(result);
  });
  it('"hello \\\\\\\"world!"', function () {
    const tst = parse('"hello \\\\\\\"world!"');
    const result = {type: '"', value: "hello \\\\\\\"world!"};
    expect(tst).to.deep.equal(result);
  });
});

describe('numbers', function () {
  it("OK: 12", function () {
    const tst = parse('12');
    const result = 12;
    expect(tst).to.be.equal(result);
  });

  it("OK: 12hz", function () {
    const tst = parse('12hz');
    const result = {num: 12, unit: "hz"};
    expect(tst).to.deep.equal(result);
  });

  it("OK: 1+2", function () {
    const tst = parse('1+2');
    const result = {
      type: "+",
      left: 1,
      right: 2
    };
    expect(tst).to.deep.equal(result);
  });
});

describe("Matches Java and JavaScript numbers (except Infinity and NaN)", function () {
  it("integers and float", function () {
    expect(parse("0")).to.be.equal(0);
    expect(parse("1")).to.be.equal(1);
    expect(parse("0.2")).to.be.equal(0.2);
    expect(parse("-55")).to.be.equal(-55);
    expect(parse("-0.6")).to.be.equal(-0.6);
  });
  it("numbers with e", function () {
    expect(parse("88E8")).to.be.equal(88E8);
    expect(parse("1e+24")).to.be.equal(1e+24);  // JavaScript-style
    expect(parse("0.4E4")).to.be.equal(0.4E4);  // Java-style
    expect(parse("-0.77E77")).to.be.equal(-0.77E77);
  });
  it("Matches fractions with a leading decimal point", function () {
    expect(parse(".3")).to.be.equal(.3);
    expect(parse("-.3")).to.be.equal(-.3);
    expect(parse(".3e-4")).to.be.equal(.3e-4);
  });
  it("postfix minus/pluss", function () {
    expect(parse("1-")).to.deep.equal({type: "-", left: 1, right: undefined});
    expect(parse("1+")).to.deep.equal({type: "+", left: 1, right: undefined});
  });
  // it("possible errors", function () {
  //   expect(parse(".")).to.be.equal(false);
  //   expect(parse("9.")).to.be.equal(false);
  //   expect(parse("1e+24.5")).to.be.equal(false);
  // });

  it("Error: 12d12", function (done) {
    try {
      const tst = parse('12d12');
    } catch (e) {
      expect(e.message).to.deep.equal("the main css audio pipe is broken");
      done();
    }
  });
});

describe("expression test: 0+1", function () {
  it("0+1", function () {
    const tst = parse('0+1');
    const result = {
      type: "+",
      left: 0,
      right: 1
    };
    expect(tst).to.deep.equal(result);
  });
});

describe("Comma and operators", function () {

  it("[1+1,2+2,3+3] - syntax interpreted", function () {
    const tst2 = parse('[1+1,2+2,3+3]');
    const result2 = [{
      type: "+",
      left: 1,
      right: 1
    }, {
      type: "+",
      left: 2,
      right: 2
    }, {
      type: "+",
      left: 3,
      right: 3
    }];
    expect(tst2).to.deep.equal(result2);
  });
});
