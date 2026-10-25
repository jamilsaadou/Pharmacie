const fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/utils/amountInWords.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,m,m.exports);
const f=process.argv[2];const d=JSON.parse(fs.readFileSync(f));d.montantEnLettres=m.exports.amountInWords(d.totalTTC);fs.writeFileSync(f,JSON.stringify(d));console.log('prep ok total',d.totalTTC);
