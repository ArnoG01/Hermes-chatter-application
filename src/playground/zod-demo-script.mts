import { z } from 'zod';

// creating a schema for strings
const mySchema = z.string();

// parsing
const r = mySchema.parse('tuna'); // => "tuna"
console.log(`We should get tuna: ${r}`);
try {
  mySchema.parse(12); // => throws ZodError
} catch (err: unknown) {
  console.log('Caught exception (expected)');
}

// "safe" parsing (doesn't throw error if validation fails)
const r1 = mySchema.safeParse('tuna'); // => { success: true; data: "tuna" }
const r2 = mySchema.safeParse(12); // => { success: false; error: ZodError }
console.log('Should get succesful tuna for r1:', r1.success);
console.log('Should fail for r2:', r2.success);
if (r1.success) {
  // .data is only available if r1.success === true
  console.log('r1 has data:', r1.data);
}

const FishEnum = z.enum(['Salmon', 'Tuna', 'Trout']);
type FishEnum = z.infer<typeof FishEnum>;
console.log(FishEnum.Values);
