import webpack from 'webpack';

const compiler = webpack({});

compiler.run((err, stats) => {
  console.log("Compiling/minifying dist/main.js");
  console.log("Stats: ", stats);

  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  /*
  compiler.close((closeErr) => {
    if (closeErr) {
      console.log(closeErr);
      return;
    }

    console.log("Compilation complete");
  });
  */
});
