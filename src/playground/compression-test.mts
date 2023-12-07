import { HuffmanEncoding } from '../lib/huffman/huffman.mjs';
import path from 'path';
import fs from 'fs';

const directoryPath = 'assets/textfiles-huffman';

fs.readdir(directoryPath, (err, files) => {
  if (err) throw err;

  files.forEach((file) => {
    fs.readFile(path.join(directoryPath, file), (err, data) => {
      if (err) throw err;
      const huffman = HuffmanEncoding.buildEncodingFromFile(data);
      const encoded = huffman.encode(data);
      const rate = encoded.length / data.length;
      const ratio = data.length / encoded.length;
      console.log(`File: ${file.padEnd(30)} Ratio: ${ratio.toFixed(2).padEnd(10)} Rate: ${rate.toFixed(2).padEnd(10)}`);
    });
  });
});
