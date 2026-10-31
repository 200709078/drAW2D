import type { GeometryDocumentObject } from '../geometry/function-types'
import type { Command, NumberArgument } from './types'

const IDENTIFIER = /[\p{L}_][\p{L}\p{N}_]*/gu

/** Objects whose value another definition can use: parameters and named functions. */
function valueNames(objects: readonly GeometryDocumentObject[]): Set<string> {
  const names = new Set<string>()
  for (const object of objects) {
    if (object.name === null) continue
    switch (object.type) {
      case 'parameter': case 'function': case 'lineWithEquation': case 'functioncomposition':
      case 'limit': case 'tangent': case 'tangentHX': case 'sequence': case 'derivative':
      case 'sectionalFunctions':
        names.add(object.name)
    }
  }
  return names
}

function numberText(argument: NumberArgument | undefined): string {
  return argument === undefined || typeof argument === 'number' ? '' : argument.expression
}

/** Every expression text of a command; point references carry no value. */
function expressionTexts(command: Command): string[] {
  switch (command.kind) {
    case 'point': return [numberText(command.point.a), numberText(command.point.b)]
    case 'namedCoordinates': return [numberText(command.a), numberText(command.b)]
    case 'vectorExpression': return [command.expression]
    case 'circleRadius': return [numberText(command.radius)]
    case 'verticalLine': return [numberText(command.x)]
    case 'sequence': return [command.expression, numberText(command.start), numberText(command.end)]
    case 'limit': return [command.expression, numberText(command.at), numberText(command.delta)]
    case 'tangent': return [command.expression, numberText(command.at)]
    case 'tangentH': case 'tangentX': return [command.expression, numberText(command.at), numberText(command.h)]
    case 'derivative': case 'function': return [command.expression]
    case 'composition': return command.expressions
    case 'piecewise': return command.sections.flatMap(section => [section.expression,
      numberText(section.startX ?? undefined), numberText(section.endX ?? undefined)])
    case 'parameter': return [numberText(command.value)]
    case 'integral': return [command.function, numberText(command.start), numberText(command.end)]
    case 'root': case 'extremum': case 'inflection': case 'asymptote':
      return [command.function, numberText(command.start), numberText(command.end)]
    case 'intersect': return [command.first, command.second, numberText(command.start), numberText(command.end)]
    case 'rotate': return [numberText(command.angle)]
    case 'curve': return [command.x, command.y, numberText(command.start), numberText(command.end)]
    case 'polar': return [command.expression, numberText(command.start), numberText(command.end)]
    case 'implicit': case 'inequality': return [command.left, command.right]
    case 'unitCircle': return [numberText(command.angle)]
    default: return []
  }
}

/**
 * Names of parameters and functions a definition uses. Scanning identifiers
 * over-approximates (a name inside another word is not matched, but a function call
 * name is), which only costs an unnecessary recomputation.
 */
export function definitionNames(command: Command, objects: readonly GeometryDocumentObject[]): Set<string> {
  const known = valueNames(objects)
  const names = new Set<string>()
  for (const text of expressionTexts(command)) {
    for (const match of text.matchAll(IDENTIFIER)) if (known.has(match[0])) names.add(match[0])
  }
  return names
}

/** Display text of a number argument, as typed. */
export function numberArgumentText(argument: NumberArgument): string {
  return typeof argument === 'number' ? String(argument) : argument.expression
}
