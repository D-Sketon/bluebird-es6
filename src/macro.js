export function BIT_FIELD_CHECK(a, b, flag = false) {
  return flag ? ((a & b) === 0) : ((a & b) !== 0);
}

export function BIT_FIELD_READ(a, b) {
  let p = 1;
  let shiftCount = 0;
  while ((a & p) === 0) {
      p <<= 1;
      shiftCount++;
  }
  return shiftCount === 0 ? ((a & b)) : ((a & b) >>> shiftCount);
}