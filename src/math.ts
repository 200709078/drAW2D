import {
  absDependencies, acosDependencies, acoshDependencies, acotDependencies, acothDependencies, acscDependencies,
  acschDependencies, addDependencies, andDependencies, asecDependencies, asechDependencies, asinDependencies,
  asinhDependencies, atan2Dependencies, atanDependencies, atanhDependencies, cbrtDependencies, ceilDependencies,
  compileDependencies, cosDependencies, coshDependencies, cotDependencies, cothDependencies, create, cscDependencies,
  cschDependencies, derivativeDependencies, divideDependencies, eDependencies, equalDependencies, erfDependencies,
  evaluateDependencies, expDependencies, expm1Dependencies, factorialDependencies, fixDependencies, floorDependencies,
  gammaDependencies, gcdDependencies, hypotDependencies, largerDependencies, largerEqDependencies, lcmDependencies,
  lgammaDependencies, log10Dependencies, log1pDependencies, log2Dependencies, logDependencies, maxDependencies,
  minDependencies, modDependencies, multiplyDependencies, notDependencies, nthRootDependencies, numberDependencies,
  orDependencies, parseDependencies, piDependencies, powDependencies, roundDependencies, secDependencies,
  sechDependencies, signDependencies, sinDependencies, sinhDependencies, smallerDependencies, smallerEqDependencies,
  sqrtDependencies, subtractDependencies, tanDependencies, tanhDependencies,
  unaryMinusDependencies, unaryPlusDependencies, unequalDependencies, xorDependencies,
  tauDependencies, iDependencies,
} from 'mathjs'

// Only the functions the input language accepts (commands/expressions.ts) and the
// parser, compiler and derivative; `create(all)` would ship all of math.js.
export const math = create({
  parseDependencies, compileDependencies, evaluateDependencies, derivativeDependencies,
  addDependencies, subtractDependencies, multiplyDependencies, divideDependencies, powDependencies, modDependencies,
  unaryMinusDependencies, unaryPlusDependencies, factorialDependencies,
  equalDependencies, unequalDependencies, smallerDependencies, largerDependencies, smallerEqDependencies,
  largerEqDependencies, andDependencies, orDependencies, xorDependencies, notDependencies,
  absDependencies, acosDependencies, acoshDependencies, acotDependencies, acothDependencies, acscDependencies,
  acschDependencies, asecDependencies, asechDependencies, asinDependencies, asinhDependencies, atanDependencies,
  atan2Dependencies, atanhDependencies, cbrtDependencies, ceilDependencies, cosDependencies, coshDependencies,
  cotDependencies, cothDependencies, cscDependencies, cschDependencies, expDependencies, expm1Dependencies,
  fixDependencies, floorDependencies, logDependencies, log10Dependencies, log1pDependencies, log2Dependencies,
  nthRootDependencies, roundDependencies, secDependencies, sechDependencies, signDependencies, sinDependencies,
  sinhDependencies, sqrtDependencies, tanDependencies, tanhDependencies, gammaDependencies, lgammaDependencies,
  erfDependencies, gcdDependencies, lcmDependencies, maxDependencies, minDependencies, hypotDependencies,
  numberDependencies, eDependencies, piDependencies, tauDependencies, iDependencies,
 
})

// Arşivdeki math.js ile aynı sürüm ve aynı log(a, b) davranışı.
math.import({
  log(a: number, b?: number): number {
    return b === undefined ? Math.log(a) : Math.log(b) / Math.log(a)
  },
}, { override: true })
