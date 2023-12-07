// Possible reference for reading up on promises and the event loop:
// https://medium.com/@juanguardado/event-loops-promises-and-their-next-generation-counterparts-36d1eb87104d

// A type guard to see if some error that you `catch` is of type Error.
// Unfortunately you cannot specify the result of a reject in Typescript.
// See https://stackoverflow.com/questions/50071115/typescript-promise-rejection-type
// There is possible solutions there to type the reject part, but consider this:
//      try {
//        const a = await Foo(33);
//        const b = await Bar(a, 44);
//        doSomething(a, b);
//      } catch (error) {
//        // The type of `error` can now be coming from either an exception thrown
//        // by `Foo`, `Bar` or `doSomething`.
//        //
//        // Unfortunately you cannot do:
//        // if (typeof error === 'Error') { };
//        // since `typeof` can only give you `string`, `number`, `object`, `function`
//        // and some other more ``esotoric'' basic types.
//        //
//        // You could do
//        if (error instanceof Error) {
//          // blah
//        }
//        // but then please also read the comments from the above link about its limitations.
//      }
function isError(e: unknown): e is Error {
  return (
    !!e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof e.message === 'string' &&
    'stack' in e &&
    typeof e.stack === 'string'
  );
}

// Read the documentation for `isError` before using this...
function isError2(e: unknown): e is Error {
  return e instanceof Error;
}

setTimeout(() => console.log('First timeout'), 0);

const myPromise = new Promise<number>((resolve, reject) => {
  // Asynchronous operation
  setTimeout(() => {
    const randomNumber = Math.random();
    if (randomNumber > 0.5) {
      resolve(randomNumber); // Promise resolved with value
    } else {
      reject(new Error('Number too small')); // Promise rejected with error object
    }
  }, 1000);
});

setTimeout(() => console.log('Second timeout'), 0);

myPromise
  .then((result) => console.log(`Result: ${result}`)) // Promise resolved handler
  .catch((error) => {
    if (isError(error)) {
      console.log(`Error: ${error.message}`); // Promise rejected handler
    }
  })
  .finally(() => console.log('The end'));

setTimeout(() => console.log('Third timeout'), 0);

console.log(
  "Let's start the game... nothing has been printed yet, as the previous promise will run as soon as we yield...",
);

setTimeout(() => console.log('Fourth timeout'), 0);

try {
  const result = await new Promise<number>((resolve, reject) => {
    // Asynchronous operation
    setTimeout(() => {
      const randomNumber = Math.random();
      if (randomNumber > 0.5) {
        resolve(randomNumber); // Promise resolved with value
      } else {
        reject(new Error('Number too small')); // Promise rejected with error object
      }
    }, 1000);
  });
  setTimeout(() => console.log('Fifth timeout (resolve)'), 0);
  console.log(`Result 2: ${result}`);
} catch (error) {
  setTimeout(() => console.log('Fifth timeout (reject)'), 0);
  if (isError2(error)) {
    console.log(`Error 2: ${error.message}`);
  }
} finally {
  console.log('The end 2');
}

console.log('lalalala');

setImmediate(() => console.log('Sneaky...')); // This one will mostly appear to come first, but not always!!!

setTimeout(() => console.log('Sixth timeout'), 0);
console.log('Note: this will be the last thing printed as the second result has an await...');
setTimeout(() => console.log('Seventh timeout'), 0);
