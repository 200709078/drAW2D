import { math } from '../math'

// Mevcut geometri motoru, aşamalı TypeScript geçişi boyunca JavaScript modülü olarak korunur.
// Asimptotlardaki atlamalar düzeltilecek.
// Mobil versiyona geçilecek.
class mPoint {
	constructor(a, b, temp = false) {
		this.type = 'point'
		temp ? this.name = null : this.name = createName('point')
		temp ? this.id = null : this.id = idCounter()
		this.a = a
		this.b = b
		this.color = getRandomColor()
		this.visibility = true
		this.size = 3
		this.temp = temp
		this.onOther = []
	}
}

class mCircleR {
	constructor(A, r, temp = false) {
		this.type = 'circleR'
		this.name = createName('circleR')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.r = r
		this.color = getRandomColor()
		this.visibility = true
		this.size = 1
		this.temp = temp
	}
}
class mCircle2 {
	constructor(A, B, temp = false) {
		this.type = 'circle2'
		this.name = createName('circleR')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.color = getRandomColor()
		this.visibility = true
		this.size = 1
		this.temp = temp
	}
}

class mCircle3 {
	constructor(A, B, C, temp = false) {
		this.type = 'circle3'
		this.name = createName('circleR')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.C = C
		this.color = getRandomColor()
		this.visibility = true
		this.size = 1
		this.temp = temp
	}
}

class mAngle {
	constructor(A, B, C, temp = false) {
		this.type = 'angle'
		this.name = createName('angle')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.C = C
		this.color = getRandomColor()
		this.visibility = true
		this.size = 1
		this.temp = temp
	}
}

class mArcMeasure {
	constructor(A, B, circle, temp = false) {
		this.type = 'arcMeasure'
		this.name = createName('arcMeasure')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.circle = circle
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mVerLine {
	constructor(x, temp = null) {
		this.type = "verLine"
		const denkCount = arrObjects.filter(f => f.name.includes("denk")).length + 1
		this.name = "denk" + denkCount
		temp ? this.id = null : this.id = idCounter()
		this.x = x
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

function normalizeLine(m, n) {
	let displayM = formatDisplayNumber(m)
	let displayN = formatDisplayNumber(n)
	let numericM = Number(displayM)
	let numericN = Number(displayN)
	if (numericM === 0) {
		return displayN;
	}

	let result = '';

	if (numericM === 1) {
		result = 'x';
	} else if (numericM === -1) {
		result = '-x';
	} else {
		result = `${displayM}x`;
	}

	if (numericN === 0) {
		return result;
	}

	if (numericN > 0) {
		result += `+${displayN}`;
	} else {
		result += `${displayN}`;
	}
	return result;
}

class mLineWithEquation {
	constructor(m, n, temp = false, startX = null, endX = null) {
		this.type = 'lineWithEquation'
		temp ? this.name = null : this.name = createName('line')
		temp ? this.id = null : this.id = idCounter()
		this.m = m
		this.n = n
		this.func = normalizeLine(m, n)
		this.startX = startX
		this.endX = endX
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mLineWithPoints {
	constructor(A, B, temp = false) {
		this.type = 'lineWithPoints'
		temp ? this.name = null : this.name = createName('line')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mLineSegment {
	constructor(A, B, temp = false) {
		this.type = 'lineSegment'
		this.name = createName('lineSegment')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.color = getRandomColor()
		this.lineDash = []
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mDistanceSegment {
	constructor(A, B, temp = false) {
		this.type = 'distanceSegment'
		this.name = createName('distanceSegment')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.B = B
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mCircleTangent {
	constructor(A, circle, temp = false) {
		this.type = 'circleTangent'
		temp ? this.name = null : this.name = createName('line')
		temp ? this.id = null : this.id = idCounter()
		this.A = A
		this.circle = circle
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}
class mSequence {
	constructor(func, s, e, temp = false) {
		this.type = 'sequence'
		this.name = createName('sequence')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.start = s
		this.end = e
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mLimit {
	constructor(func, a, temp = false) {
		this.type = 'limit'
		this.name = createName('limit')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.approachVal = a
		this.approachValRight = Number(a) + 0.4
		this.approachValLeft = a - 0.4
		this.color = getRandomColor()
		this.lineDash = []
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mFunction {
	constructor(func, temp = false, startX = null, endX = null) {
		this.type = 'function'
		temp ? this.name = null : this.name = createName('function')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.startX = startX
		this.endX = endX
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mFunctionComposions {
	constructor(funcs, temp = false, startX = null, endX = null) {
		this.type = 'functioncomposition'
		temp ? this.name = null : this.name = createName('functioncomposition')
		temp ? this.id = null : this.id = idCounter()
		this.funcs = funcs
		this.func = bileskeProcess(funcs)
		this.startX = startX
		this.endX = endX
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}
class mTangent {
	constructor(func, a, temp = false) {
		this.type = 'tangent'
		this.name = createName('tangent')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.approachVal = a
		let m = math.evaluate(derivative(func), { x: a })
		let c = math.evaluate(func, { x: a }) - m * a
		this.tngLine = new mLineWithEquation(m, c, true)
		this.color = getRandomColor()
		this.lineDash = []
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mTangentHX {
	constructor(func, a, haveH, temp = false) {
		this.type = 'tangentHX'
		this.name = createName('tangentHX')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.approachVal = a
		this.h = 2
		this.haveH = haveH
		let A = new mPoint(a, math.evaluate(func, { x: a }), true)
		let B = haveH ? new mPoint(a + this.h, math.evaluate(func, { x: a + this.h }), true) : new mPoint(this.h, math.evaluate(func, { x: this.h }), true)
		let m = math.evaluate(derivative(func), { x: a })
		let c = math.evaluate(func, { x: a }) - m * a
		this.tngLine = new mLineWithEquation(m, c, true)
		this.aodLine = new mLineWithPoints(A, B, true)
		this.color = getRandomColor()
		this.lineDash = []
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mDerivative {
	constructor(func, derFunc, temp = false) {
		this.type = 'derivative'
		this.name = createName('derivative')
		temp ? this.id = null : this.id = idCounter()
		this.func = func
		this.derFunc = derFunc
		this.color = getRandomColor()
		this.lineDash = []
		this.visibility = true
		this.size = 2
		this.temp = temp
	}
}

class mSectionalFunctions {
	constructor(str, temp = false) {
		this.name = createName('function')
		temp ? this.id = null : this.id = idCounter()
		this.secFuncs = null
		this.color = getRandomColor()
		this.visibility = true
		this.size = 2
		this.type = 'sectionalFunctions'
		this.cmd = str
		this.temp = temp
	}
}

function distanceAB(A, B) {
	return Math.sqrt(Math.pow(B.b - A.b, 2) + Math.pow(B.a - A.a, 2))
}

function getReflectedPoint(source, center) {
	return {
		a: 2 * Number(center.a) - Number(source.a),
		b: 2 * Number(center.b) - Number(source.b),
	}
}

function createPrimePointName(sourceName) {
	let baseName = sourceName + "'"
	let name = baseName
	let i = 1
	let names = arrObjects.map(item => item.name)

	while (names.includes(name)) {
		name = baseName + i
		i++
	}
	return name
}

function createReflectedPoint(source, center) {
	let reflected = getReflectedPoint(source, center)
	let point = new mPoint(reflected.a, reflected.b)
	point.name = createPrimePointName(source.name)
	point.onOther.push({
		type: 'reflectPoint',
		sourceId: source.id,
		centerId: center.id,
	})
	return point
}

function getReflectPointConstraint(point) {
	if (!point || point.type != 'point') return null
	return point.onOther.find(item => item.type == 'reflectPoint') || null
}

function isIntersectableLine(obj) {
	if (!obj) return false
	return obj.type == 'lineWithPoints' || obj.type == 'lineWithEquation' || obj.type == 'verLine' || obj.type == 'lineSegment'
}

function isIntersectableCircle(obj) {
	if (!obj) return false
	return obj.type == 'circleR' || obj.type == 'circle2' || obj.type == 'circle3'
}

function isIntersectableObject(obj) {
	return isIntersectableLine(obj) || isIntersectableCircle(obj)
}

function getLineDescriptor(line) {
	if (!isIntersectableLine(line)) return { status: false }

	if (line.type == 'verLine') {
		return { status: true, limited: false, vertical: true, x: Number(line.x) }
	}

	if (line.type == 'lineWithEquation') {
		return { status: true, limited: false, vertical: false, m: Number(line.m), c: Number(line.n) }
	}

	if (line.type == 'lineWithPoints' || line.type == 'lineSegment') {
		let limited = line.type == 'lineSegment'
		let A = { a: Number(line.A.a), b: Number(line.A.b) }
		let B = { a: Number(line.B.a), b: Number(line.B.b) }

		if (Number(line.A.a) == Number(line.B.a)) {
			if (Number(line.A.b) == Number(line.B.b)) return { status: false }
			return { status: true, limited: limited, vertical: true, x: Number(line.A.a), A: A, B: B }
		}

		let equation = createLineEquation(line.A, line.B)
		return { status: true, limited: limited, vertical: false, m: Number(equation.m), c: Number(equation.c), A: A, B: B }
	}

	return { status: false }
}

function isPointAttachableLine(obj) {
	if (!obj) return false
	return obj.type == 'lineWithPoints' || obj.type == 'lineWithEquation' || obj.type == 'verLine' || obj.type == 'lineSegment'
}

function getProjectionOnCircleTangent(tangent, a, b, lineIndex = null) {
	if (!tangent || tangent.type != 'circleTangent') return { status: false }
	let tangentData = getCircleTangentLines(tangent.A, tangent.circle)
	if (!tangentData.status || tangentData.lines.length == 0) return { status: false }

	let projectLine = (line, index) => {
		let projection = getProjectionOnLine(line, a, b)
		if (!projection.status) return null
		let distance = Math.sqrt((Number(a) - projection.a) ** 2 + (Number(b) - projection.b) ** 2)
		return {
			status: true,
			a: projection.a,
			b: projection.b,
			lineIndex: index,
			distance: distance,
		}
	}

	if (lineIndex != null && tangentData.lines[lineIndex]) {
		return projectLine(tangentData.lines[lineIndex], lineIndex) || { status: false }
	}

	let projections = tangentData.lines
		.map((line, index) => projectLine(line, index))
		.filter(projection => projection && projection.status)

	if (projections.length == 0) return { status: false }
	return projections.reduce((nearest, projection) => projection.distance < nearest.distance ? projection : nearest)
}

function getProjectionOnLine(line, a, b) {
	let desc = getLineDescriptor(line)
	if (!desc.status) return { status: false }

	a = Number(a)
	b = Number(b)
	if (!Number.isFinite(a) || !Number.isFinite(b)) return { status: false }

	if (desc.limited) {
		let dx = desc.B.a - desc.A.a
		let dy = desc.B.b - desc.A.b
		let lengthSquared = dx * dx + dy * dy
		if (lengthSquared == 0) return { status: false }

		let t = ((a - desc.A.a) * dx + (b - desc.A.b) * dy) / lengthSquared
		t = Math.max(0, Math.min(1, t))

		return {
			status: true,
			a: desc.A.a + t * dx,
			b: desc.A.b + t * dy,
		}
	}

	if (desc.vertical) {
		return { status: true, a: desc.x, b: b }
	}

	let denominator = desc.m * desc.m + 1
	let projectedA = (a + desc.m * (b - desc.c)) / denominator
	let projectedB = desc.m * projectedA + desc.c

	return { status: true, a: projectedA, b: projectedB }
}

function getProjectionOnSegment(A, B, a, b) {
	A = { a: Number(A.a), b: Number(A.b) }
	B = { a: Number(B.a), b: Number(B.b) }
	a = Number(a)
	b = Number(b)

	let dx = B.a - A.a
	let dy = B.b - A.b
	let lengthSquared = dx * dx + dy * dy
	if (lengthSquared == 0 || !Number.isFinite(a) || !Number.isFinite(b)) return { status: false }

	let t = ((a - A.a) * dx + (b - A.b) * dy) / lengthSquared
	t = Math.max(0, Math.min(1, t))
	let projectedA = A.a + t * dx
	let projectedB = A.b + t * dy
	let distance = Math.sqrt((a - projectedA) ** 2 + (b - projectedB) ** 2)

	return {
		status: true,
		a: projectedA,
		b: projectedB,
		distance: distance,
	}
}

function getProjectionOnAngle(angle, a, b) {
	if (!angle || angle.type != 'angle') return { status: false }

	let projectionAB = getProjectionOnSegment(angle.A, angle.B, a, b)
	let projectionBC = getProjectionOnSegment(angle.B, angle.C, a, b)
	if (!projectionAB.status && !projectionBC.status) return { status: false }
	if (!projectionAB.status) return projectionBC
	if (!projectionBC.status) return projectionAB

	return projectionAB.distance <= projectionBC.distance ? projectionAB : projectionBC
}

function createPointFromHitOrMouse(hit, mousePos) {
	if (hit.hitType == 'point') {
		return { point: hit.hit, created: false }
	}

	if (isIntersectableCircle(hit.hit)) {
		let circle = hit.hit
		let circleData = getCircleDescriptor(circle)
		if (circleData.status) {
			let angle = Math.atan2(mousePos.y - circleData.n, mousePos.x - circleData.m)
			let point = new mPoint(
				Number(circleData.m + circleData.r * Math.cos(angle)).toFixed(2),
				Number(circleData.n + circleData.r * Math.sin(angle)).toFixed(2)
			)
			point.onOther.push({
				type: "onCircle",
				circleId: circle.id
			})
			return { point: point, created: true }
		}
	}

	if (isPointAttachableLine(hit.hit)) {
		let projection = getProjectionOnLine(hit.hit, mousePos.x, mousePos.y)
		if (projection.status) {
			let point = new mPoint(Number(projection.a).toFixed(2), Number(projection.b).toFixed(2))
			point.onOther.push({
				type: "onLine",
				lineId: hit.hit.id
			})
			return { point: point, created: true }
		}
	}

	if (hit.hitType == 'circleTangent') {
		let projection = getProjectionOnCircleTangent(hit.hit, mousePos.x, mousePos.y)
		if (projection.status) {
			let point = new mPoint(Number(projection.a).toFixed(2), Number(projection.b).toFixed(2))
			point.onOther.push({
				type: "onCircleTangent",
				tangentId: hit.hit.id,
				lineIndex: projection.lineIndex,
			})
			return { point: point, created: true }
		}
	}

	if (hit.hitType == 'angle') {
		let projection = getProjectionOnAngle(hit.hit, mousePos.x, mousePos.y)
		if (projection.status) {
			let point = new mPoint(Number(projection.a).toFixed(2), Number(projection.b).toFixed(2))
			point.onOther.push({
				type: "onAngle",
				angleId: hit.hit.id
			})
			return { point: point, created: true }
		}
	}

	return { point: new mPoint(mousePos.x, mousePos.y), created: true }
}

function getCircle3RA(circle) {
	const D = 2 * (
		circle.A.a * (circle.B.b - circle.C.b) +
		circle.B.a * (circle.C.b - circle.A.b) +
		circle.C.a * (circle.A.b - circle.B.b)
	)

	if (Math.abs(D) < 1e-10) return { status: false }

	const a2 = circle.A.a * circle.A.a + circle.A.b * circle.A.b
	const b2 = circle.B.a * circle.B.a + circle.B.b * circle.B.b
	const c2 = circle.C.a * circle.C.a + circle.C.b * circle.C.b

	const ux = (
		a2 * (circle.B.b - circle.C.b) +
		b2 * (circle.C.b - circle.A.b) +
		c2 * (circle.A.b - circle.B.b)
	) / D

	const uy = (
		a2 * (circle.C.a - circle.B.a) +
		b2 * (circle.A.a - circle.C.a) +
		c2 * (circle.B.a - circle.A.a)
	) / D

	const r = Math.sqrt((ux - circle.A.a) ** 2 + (uy - circle.A.b) ** 2)

	return {
		m: ux,
		n: uy,
		r: r,
	}
}

function getCircleCenterRadius(circle) {
	if (circle.type == 'circleR') {
		return {
			m: Number(circle.A.a),
			n: Number(circle.A.b),
			r: Number(circle.r),
			status: true,
		}
	}
	if (circle.type == 'circle2') {
		return {
			m: Number(circle.A.a),
			n: Number(circle.A.b),
			r: distanceAB(circle.A, circle.B),
			status: true,
		}
	}
	if (circle.type == 'circle3') {
		let data = getCircle3RA(circle)
		return {
			m: Number(data.m),
			n: Number(data.n),
			r: Number(data.r),
			status: data.status !== false,
		}
	}
	return { status: false }
}

function getCircleTangentLines(point, circle) {
	let circleData = getCircleCenterRadius(circle)
	if (!circleData.status) return { status: false, reason: 'invalidCircle', lines: [] }

	let px = Number(point.a)
	let py = Number(point.b)
	let cx = circleData.m
	let cy = circleData.n
	let r = circleData.r
	let dx = px - cx
	let dy = py - cy
	let d = Math.sqrt(dx * dx + dy * dy)
	let eps = 1e-7

	if (d < r - eps) return { status: false, reason: 'inside', lines: [] }
	if (d < eps) return { status: false, reason: 'inside', lines: [] }

	if (Math.abs(d - r) <= eps) {
		let touchPoint = new mPoint(px, py, true)
		let tangentPoint = new mPoint(px - dy, py + dx, true)
		return {
			status: true,
			tangentPoints: [touchPoint],
			lines: [new mLineWithPoints(point, tangentPoint, true)],
		}
	}

	let ex = dx / d
	let ey = dy / d
	let baseDistance = (r * r) / d
	let height = (r * Math.sqrt(d * d - r * r)) / d
	let baseX = cx + baseDistance * ex
	let baseY = cy + baseDistance * ey
	let perpX = -ey
	let perpY = ex

	let T1 = new mPoint(baseX + height * perpX, baseY + height * perpY, true)
	let T2 = new mPoint(baseX - height * perpX, baseY - height * perpY, true)

	return {
		status: true,
		tangentPoints: [T1, T2],
		lines: [
			new mLineWithPoints(point, T1, true),
			new mLineWithPoints(point, T2, true),
		],
	}
}

function getCircleTangentTouchPoint(tangent, pointIndex = 0) {
	if (!tangent || tangent.type != 'circleTangent') return null
	let tangentData = getCircleTangentLines(tangent.A, tangent.circle)
	if (!tangentData.status || !tangentData.tangentPoints) return null
	return tangentData.tangentPoints[pointIndex] || null
}

function createCircleTangentTouchPoints(tangent) {
	let tangentData = getCircleTangentLines(tangent.A, tangent.circle)
	if (!tangentData.status || !tangentData.tangentPoints) return []

	return tangentData.tangentPoints.map((touchPoint, index) => {
		let point = new mPoint(touchPoint.a, touchPoint.b)
		point.onOther.push({
			type: 'circleTangentTouchPoint',
			tangentId: tangent.id,
			pointIndex: index,
		})
		return point
	})
}

function addCircleTangentWithTouchPoints(point, circle) {
	let tangent = new mCircleTangent(point, circle)
	arrObjects.push(tangent)
	createCircleTangentTouchPoints(tangent).forEach(touchPoint => arrObjects.push(touchPoint))
	return tangent
}

function getCircleDescriptor(circle) {
	if (!isIntersectableCircle(circle)) return { status: false }

	if (circle.type == 'circleR') {
		return {
			status: true,
			m: Number(circle.A.a),
			n: Number(circle.A.b),
			r: Number(circle.r),
		}
	}

	if (circle.type == 'circle2') {
		return {
			status: true,
			m: Number(circle.A.a),
			n: Number(circle.A.b),
			r: distanceAB(circle.A, circle.B),
		}
	}

	let circleData = getCircle3RA(circle)
	return {
		status: true,
		m: Number(circleData.m),
		n: Number(circleData.n),
		r: Number(circleData.r),
	}
}

function isPointOnLimitedLine(desc, a, b, epsilon = 0.0000001) {
	if (!desc.limited) return true

	return a >= Math.min(desc.A.a, desc.B.a) - epsilon &&
		a <= Math.max(desc.A.a, desc.B.a) + epsilon &&
		b >= Math.min(desc.A.b, desc.B.b) - epsilon &&
		b <= Math.max(desc.A.b, desc.B.b) + epsilon
}

function getCollinearIntersection(l1, l2, epsilon = 0.0000001) {
	if (!l1.limited && !l2.limited) return { status: false, reason: 'infinite' }
	if (l1.limited && !l2.limited) return { status: false, reason: 'infinite' }
	if (!l1.limited && l2.limited) return { status: false, reason: 'infinite' }

	let axis = Math.abs(l1.A.a - l1.B.a) >= Math.abs(l1.A.b - l1.B.b) ? 'a' : 'b'
	let l1Start = Math.min(l1.A[axis], l1.B[axis])
	let l1End = Math.max(l1.A[axis], l1.B[axis])
	let l2Start = Math.min(l2.A[axis], l2.B[axis])
	let l2End = Math.max(l2.A[axis], l2.B[axis])
	let overlapStart = Math.max(l1Start, l2Start)
	let overlapEnd = Math.min(l1End, l2End)

	if (overlapEnd < overlapStart - epsilon) return { status: false, reason: 'empty' }
	if (Math.abs(overlapEnd - overlapStart) < epsilon) {
		let candidates = [l1.A, l1.B, l2.A, l2.B]
		let point = candidates.find(p => Math.abs(p[axis] - overlapStart) < epsilon)
		if (point) return { status: true, reason: 'point', a: point.a, b: point.b }
	}
	return { status: false, reason: 'infinite' }
}

function getLineIntersection(line1, line2) {
	let l1 = getLineDescriptor(line1)
	let l2 = getLineDescriptor(line2)
	const epsilon = 0.0000001

	if (!l1.status || !l2.status) return { status: false, reason: 'empty' }
	if (l1.vertical && l2.vertical) {
		if (Math.abs(l1.x - l2.x) < epsilon) return getCollinearIntersection(l1, l2, epsilon)
		return { status: false, reason: 'empty' }
	}

	let a, b
	if (l1.vertical) {
		a = l1.x
		b = l2.m * a + l2.c
	} else if (l2.vertical) {
		a = l2.x
		b = l1.m * a + l1.c
	} else {
		if (Math.abs(l1.m - l2.m) < epsilon) {
			if (Math.abs(l1.c - l2.c) < epsilon) return getCollinearIntersection(l1, l2, epsilon)
			return { status: false, reason: 'empty' }
		}
		a = (l2.c - l1.c) / (l1.m - l2.m)
		b = l1.m * a + l1.c
	}

	if (!Number.isFinite(a) || !Number.isFinite(b)) return { status: false, reason: 'empty' }
	if (!isPointOnLimitedLine(l1, a, b, epsilon) || !isPointOnLimitedLine(l2, a, b, epsilon)) {
		return { status: false, reason: 'empty' }
	}
	return { status: true, reason: 'point', a: a, b: b }
}

function dedupeIntersectionPoints(points, epsilon = 0.0000001) {
	let uniquePoints = []
	points.forEach(point => {
		if (!Number.isFinite(point.a) || !Number.isFinite(point.b)) return
		let exists = uniquePoints.some(item =>
			Math.abs(item.a - point.a) < epsilon &&
			Math.abs(item.b - point.b) < epsilon
		)
		if (!exists) uniquePoints.push(point)
	})
	return uniquePoints
}

function getLineCircleIntersection(lineObj, circleObj) {
	let line = getLineDescriptor(lineObj)
	let circle = getCircleDescriptor(circleObj)
	const epsilon = 0.0000001

	if (!line.status || !circle.status || circle.r < 0) return { status: false, reason: 'empty', points: [] }

	let points = []
	if (line.vertical) {
		let dx = line.x - circle.m
		let delta = circle.r * circle.r - dx * dx
		if (delta < -epsilon) return { status: false, reason: 'empty', points: [] }
		if (Math.abs(delta) < epsilon) {
			points.push({ a: line.x, b: circle.n })
		} else {
			let root = Math.sqrt(delta)
			points.push({ a: line.x, b: circle.n + root })
			points.push({ a: line.x, b: circle.n - root })
		}
	} else {
		let denominator = line.m * line.m + 1
		let footX = (circle.m + line.m * (circle.n - line.c)) / denominator
		let footY = line.m * footX + line.c
		let distanceToLine = Math.abs(line.m * circle.m - circle.n + line.c) / Math.sqrt(denominator)
		let delta = circle.r * circle.r - distanceToLine * distanceToLine
		if (delta < -epsilon) return { status: false, reason: 'empty', points: [] }
		if (Math.abs(delta) < epsilon) {
			points.push({ a: footX, b: footY })
		} else {
			let offset = Math.sqrt(delta)
			let dirLength = Math.sqrt(denominator)
			let ux = 1 / dirLength
			let uy = line.m / dirLength
			points.push({ a: footX + ux * offset, b: footY + uy * offset })
			points.push({ a: footX - ux * offset, b: footY - uy * offset })
		}
	}

	points = dedupeIntersectionPoints(points).filter(point => isPointOnLimitedLine(line, point.a, point.b, epsilon))
	return points.length > 0 ? { status: true, reason: 'points', points: points } : { status: false, reason: 'empty', points: [] }
}

function getCircleCircleIntersection(circleObj1, circleObj2) {
	let c1 = getCircleDescriptor(circleObj1)
	let c2 = getCircleDescriptor(circleObj2)
	const epsilon = 0.0000001

	if (!c1.status || !c2.status || c1.r < 0 || c2.r < 0) return { status: false, reason: 'empty', points: [] }

	let dx = c2.m - c1.m
	let dy = c2.n - c1.n
	let d = Math.sqrt(dx * dx + dy * dy)

	if (d < epsilon && Math.abs(c1.r - c2.r) < epsilon) return { status: false, reason: 'infinite', points: [] }
	if (d < epsilon) return { status: false, reason: 'empty', points: [] }
	if (d > c1.r + c2.r + epsilon) return { status: false, reason: 'empty', points: [] }
	if (d < Math.abs(c1.r - c2.r) - epsilon) return { status: false, reason: 'empty', points: [] }

	let a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d)
	let hSquared = c1.r * c1.r - a * a
	if (hSquared < -epsilon) return { status: false, reason: 'empty', points: [] }

	let xm = c1.m + a * dx / d
	let ym = c1.n + a * dy / d
	if (Math.abs(hSquared) < epsilon) return { status: true, reason: 'points', points: [{ a: xm, b: ym }] }

	let h = Math.sqrt(hSquared)
	let rx = -dy * (h / d)
	let ry = dx * (h / d)
	return {
		status: true,
		reason: 'points',
		points: dedupeIntersectionPoints([
			{ a: xm + rx, b: ym + ry },
			{ a: xm - rx, b: ym - ry },
		]),
	}
}

function getObjectIntersection(obj1, obj2) {
	if (isIntersectableLine(obj1) && isIntersectableLine(obj2)) {
		let lineIntersection = getLineIntersection(obj1, obj2)
		return lineIntersection.status
			? { status: true, reason: 'points', points: [{ a: lineIntersection.a, b: lineIntersection.b }] }
			: { status: false, reason: lineIntersection.reason, points: [] }
	}

	if (isIntersectableLine(obj1) && isIntersectableCircle(obj2)) return getLineCircleIntersection(obj1, obj2)
	if (isIntersectableCircle(obj1) && isIntersectableLine(obj2)) return getLineCircleIntersection(obj2, obj1)
	if (isIntersectableCircle(obj1) && isIntersectableCircle(obj2)) return getCircleCircleIntersection(obj1, obj2)

	return { status: false, reason: 'empty', points: [] }
}

function createReservedName(type, reservedNames = []) {
	let existingNames = arrObjects.map(item => item.name)
	let oldArrObjects = arrObjects
	arrObjects = reservedNames.map(name => ({ name: name }))
	arrObjects = arrObjects.concat(oldArrObjects)
	let name = createName(type)
	arrObjects = oldArrObjects
	if (existingNames.includes(name)) return createName(type)
	return name
}

function createIntersectionPoints(obj1, obj2) {
	let intersection = getObjectIntersection(obj1, obj2)
	let points = []
	let ownerPointData = intersection.points[0] || { a: NaN, b: NaN }
	let ownerPoint = new mPoint(ownerPointData.a, ownerPointData.b)
	ownerPoint.intersectionStatus = intersection.reason
	ownerPoint.intersectionOwner = true
	ownerPoint.onOther.push({
		type: 'intersectLines',
		line1Id: obj1.id,
		line2Id: obj2.id,
		pointIndex: 0,
	})
	points.push(ownerPoint)

	let secondPointData = intersection.points[1] || { a: NaN, b: NaN }
	let secondPoint = new mPoint(secondPointData.a, secondPointData.b)
	secondPoint.name = createReservedName('point', [ownerPoint.name])
	secondPoint.intersectionStatus = intersection.reason
	secondPoint.hideInLabels = true
	secondPoint.onOther.push({
		type: 'intersectLines',
		line1Id: obj1.id,
		line2Id: obj2.id,
		pointIndex: 1,
		ownerId: ownerPoint.id,
	})
	points.push(secondPoint)

	ownerPoint.intersectionPointIds = points.map(point => point.id)
	return points
}

function createIntersectionPoint(line1, line2) {
	return createIntersectionPoints(line1, line2)[0]
}

function getIntersectionPointConstraint(point) {
	if (!point || point.type != 'point') return null
	return point.onOther.find(item => item.type == 'intersectLines') || null
}

function getCircleTangentTouchPointConstraint(point) {
	if (!point || point.type != 'point') return null
	return point.onOther.find(item => item.type == 'circleTangentTouchPoint') || null
}

function getIntersectionOutput(point) {
	let relatedPoints = arrObjects.filter(item => {
		if (item.id == point.id) return true
		let constraint = getIntersectionPointConstraint(item)
		return constraint && constraint.ownerId == point.id
	})

	let visiblePoints = relatedPoints.filter(item =>
		Number.isFinite(Number(item.a)) &&
		Number.isFinite(Number(item.b))
	)

	if (visiblePoints.length > 0) {
		return visiblePoints
			.map(item => item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')')
			.join('<br>')
	}
	if (point.intersectionStatus == 'infinite') return '∞'
	return '∅'
}

function formatDisplayNumber(value) {
	let numberValue = Number(value)
	if (!Number.isFinite(numberValue)) return String(value)
	let roundedValue = Math.round(numberValue)
	if (Math.abs(numberValue - roundedValue) < 0.000001) return String(roundedValue)
	return numberValue.toFixed(2)
}

function getPointDisplayCoordinate(value) {
	return formatDisplayNumber(value)
}

function formatPointPair(point) {
	return '(' + getPointDisplayCoordinate(point.a) + ',' + getPointDisplayCoordinate(point.b) + ')'
}

function formatPointNames(...points) {
	return points.map(point => point ? point.name : '?').join(',')
}

function formatCircleInput(circle) {
	if (circle.type == 'circle2') {
		return circle.name + ': Çember(' + formatPointNames(circle.A, circle.B) + ')'
	}

	if (circle.type == 'circle3') {
		return circle.name + ': Çember(' + formatPointNames(circle.A, circle.B, circle.C) + ')'
	}
	if (circle.type == 'circleR') {
		return circle.name + ': Çember(' + formatPointNames(circle.A) + ',' + circle.r + ')'
	}

	return ''
}

function calculateAngle(ag) {
	let u = { x: ag.A.a - ag.B.a, y: ag.A.b - ag.B.b }
	let v = { x: ag.C.a - ag.B.a, y: ag.C.b - ag.B.b }
	let angleBA = Math.atan(u.y / u.x) * 180 / Math.PI
	if (u.x > 0 && u.y >= 0) {
		angleBA = angleBA
	} else if (u.x < 0 && u.y > 0) {
		angleBA = angleBA + 180
	} else if (u.x < 0 && u.y <= 0) {
		angleBA = angleBA + 180
	} else if (u.x >= 0 && u.y <= 0) {
		angleBA = angleBA + 360
	}
	let angleBC = Math.atan(v.y / v.x) * 180 / Math.PI
	if (v.x > 0 && v.y >= 0) {
		angleBC = angleBC
	} else if (v.x < 0 && v.y > 0) {
		angleBC = angleBC + 180
	} else if (v.x < 0 && v.y <= 0) {
		angleBC = angleBC + 180
	} else if (v.x >= 0 && v.y <= 0) {
		angleBC = angleBC + 360
	}
	return { angleBA, angleBC }
}

function getAngleMeasure(ag) {
	let angles = calculateAngle(ag)
	return angles.angleBC - angles.angleBA < 0 ? angles.angleBC - angles.angleBA + 360 : angles.angleBC - angles.angleBA
}

function normalizeDegree(deg) {
	return ((deg % 360) + 360) % 360
}

function getPointAngleOnCircle(point, circleData) {
	return normalizeDegree(Math.atan2(Number(point.b) - circleData.n, Number(point.a) - circleData.m) * 180 / Math.PI)
}

function isPointAtCircleCenter(point, circleData, epsilon = 0.0001) {
	return Math.abs(Number(point.a) - circleData.m) < epsilon && Math.abs(Number(point.b) - circleData.n) < epsilon
}

function isPointOnCircleData(point, circleData, epsilon = 0.01) {
	let distance = Math.sqrt((Number(point.a) - circleData.m) ** 2 + (Number(point.b) - circleData.n) ** 2)
	return Math.abs(distance - circleData.r) < epsilon
}

function isAngleInCcwArc(angle, start, span, epsilon = 0.0001) {
	let relative = normalizeDegree(angle - start)
	return relative > epsilon && relative < span - epsilon
}

function getAngleArcInfo(ag, angleBetween) {
	for (const circle of arrObjects) {
		if (!isIntersectableCircle(circle)) continue

		let circleData = getCircleDescriptor(circle)
		if (!circleData.status) continue

		let aOnCircle = isPointOnCircleData(ag.A, circleData)
		let bOnCircle = isPointOnCircleData(ag.B, circleData)
		let cOnCircle = isPointOnCircleData(ag.C, circleData)
		if (!aOnCircle || !cOnCircle) continue

		let angleA = getPointAngleOnCircle(ag.A, circleData)
		let angleB = getPointAngleOnCircle(ag.B, circleData)
		let angleC = getPointAngleOnCircle(ag.C, circleData)
		let spanAC = normalizeDegree(angleC - angleA)
		let spanCA = normalizeDegree(angleA - angleC)

		if (isPointAtCircleCenter(ag.B, circleData)) {
			let useAC = Math.abs(spanAC - angleBetween) <= Math.abs(spanCA - angleBetween)
			return {
				circleData: circleData,
				startAngle: useAC ? angleA : angleC,
				span: useAC ? spanAC : spanCA,
			}
		}

		if (bOnCircle) {
			let bInAC = isAngleInCcwArc(angleB, angleA, spanAC)
			return {
				circleData: circleData,
				startAngle: bInAC ? angleC : angleA,
				span: bInAC ? spanCA : spanAC,
			}
		}
	}

	return null
}

function getPositiveArcMeasure(A, B, circle) {
	let circleData = getCircleDescriptor(circle)
	if (!circleData.status) return null

	let angleA = getPointAngleOnCircle(A, circleData)
	let angleB = getPointAngleOnCircle(B, circleData)
	return {
		circleData: circleData,
		startAngle: angleA,
		span: normalizeDegree(angleB - angleA),
	}
}

function getPointCircleConstraint(point) {
	if (!point || point.type != 'point') return null
	return point.onOther.find(item => item.type == 'onCircle') || null
}

function getCirclesForPoint(point) {
	if (!point || point.type != 'point') return []
	return arrObjects.filter(item => {
		if (!isIntersectableCircle(item)) return false
		let circleData = getCircleDescriptor(item)
		return circleData.status && isPointOnCircleData(point, circleData)
	})
}

function createPointOnCircle(circle, mousePos) {
	let circleData = getCircleDescriptor(circle)
	if (!circleData.status) return null

	let angle = Math.atan2(mousePos.y - circleData.n, mousePos.x - circleData.m)
	let point = new mPoint(
		Number(circleData.m + circleData.r * Math.cos(angle)).toFixed(2),
		Number(circleData.n + circleData.r * Math.sin(angle)).toFixed(2)
	)
	point.onOther.push({
		type: 'onCircle',
		circleId: circle.id,
	})
	return point
}

function getArcMeasurePointFromHit(hit, mousePos, expectedCircle = null) {
	if (hit.hitType == 'point') {
		let point = hit.hit
		let circles = getCirclesForPoint(point)
		if (expectedCircle) {
			return circles.some(circle => circle.id == expectedCircle.id)
				? { status: true, point: point, circle: expectedCircle, created: false }
				: { status: false, reason: 'differentCircle' }
		}

		let constraint = getPointCircleConstraint(point)
		let constrainedCircle = constraint ? arrObjects.find(item => item.id == constraint.circleId) : null
		let circle = constrainedCircle || circles[0]
		if (!circle) return { status: false, reason: 'notOnCircle' }
		return { status: true, point: point, circle: circle, created: false }
	}

	if (isIntersectableCircle(hit.hit)) {
		let circle = hit.hit
		if (expectedCircle && circle.id != expectedCircle.id) return { status: false, reason: 'differentCircle' }

		let point = createPointOnCircle(circle, mousePos)
		if (!point) return { status: false, reason: 'notOnCircle' }
		return { status: true, point: point, circle: circle, created: true }
	}

	return { status: false, reason: 'notOnCircle' }
}

function updateReflectPointRows() {
	arrObjects.forEach(item => {
		let reflectConstraint = getReflectPointConstraint(item)
		if (!reflectConstraint) return

		let input = document.getElementById(item.id + '-input')
		let output = document.getElementById(item.id + '-output')
		if (!input || !output) return

		let source = arrObjects.find(obj => obj.id == reflectConstraint.sourceId)
		let center = arrObjects.find(obj => obj.id == reflectConstraint.centerId)
		input.value = 'YansıtNokta(' + (source ? source.name : '?') + ',' + (center ? center.name : '?') + ')'
		output.value = item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
	})
}

function updateIntersectionPointRows() {
	arrObjects.forEach(item => {
		let intersectionConstraint = getIntersectionPointConstraint(item)
		if (!intersectionConstraint) return

		let input = document.getElementById(item.id + '-input')
		let output = document.getElementById(item.id + '-output')
		if (!input || !output) return

		let line1 = arrObjects.find(obj => obj.id == intersectionConstraint.line1Id)
		let line2 = arrObjects.find(obj => obj.id == intersectionConstraint.line2Id)
		input.value = item.name + '=Kesiştir(' + (line1 ? line1.name : '?') + ',' + (line2 ? line2.name : '?') + ')'
		output.innerHTML = getIntersectionOutput(item)
	})
}

function text2canvas(x, y, style, align, font, text) {
	ctx.fillStyle = style
	ctx.textAlign = align
	ctx.font = font
	ctx.fillText(text, x, y)
	ctx.textAlign = 'left'
	ctx.font = '10px arial'
}

function formatAxisLabel(n, unit, symbol = null) {
	if (symbol) {
		if (n == 0) return '0'
		if (n == 1) return symbol
		if (n == -1) return '-' + symbol
		return n + symbol
	}
	return formatDisplayNumber(n * unit)
}

function drawAll() {
	reprojectAllOnOther()
	ctx.strokeStyle = ctx.fillStyle = 'white'
	ctx.fillRect(0, 0, innerWidth, innerHeight)

	const minorStep = 0.2
	const axisEpsilon = 0.000001
	const firstHorizontalGrid = Math.floor(minY / minorStep) * minorStep
	const lastHorizontalGrid = minY + canvas.height / scaleX
	for (let gridY = firstHorizontalGrid; gridY <= lastHorizontalGrid + axisEpsilon; gridY += minorStep) {
		gridY = Number(gridY.toFixed(10))
		let canvasY = (gridY - minY) * scaleX
		let majorGridY = Math.round(gridY)
		let isMajor = Math.abs(gridY - majorGridY) < axisEpsilon

		ctx.beginPath()
		ctx.lineWidth = isMajor ? .5 : .2
		ctx.strokeStyle = "black"
		if (Math.abs(gridY) < axisEpsilon) {
			ctx.lineWidth = 2
			ctx.strokeStyle = "red"
		}
		ctx.moveTo(0, canvasY)
		ctx.lineTo(canvas.width, canvasY)
		ctx.stroke()
		ctx.closePath()

		if (isMajor && Math.abs(majorGridY * unitX) >= axisEpsilon) {
			let txt = formatDisplayNumber(-majorGridY * unitX)
			text2canvas(-minX * scaleY + 10, canvasY + 15, 'black', 'center', '15px arial', txt)
		}
	}
	let xAxisSymbol = null
	if (Math.abs(unitY - Math.E) < 0.0001) xAxisSymbol = 'e'
	if (Math.abs(unitY - Math.PI) < 0.0001) xAxisSymbol = '\u03c0'
	const firstVerticalGrid = Math.floor(minX / minorStep) * minorStep
	const lastVerticalGrid = minX + canvas.width / scaleY
	for (let gridX = firstVerticalGrid; gridX <= lastVerticalGrid + axisEpsilon; gridX += minorStep) {
		gridX = Number(gridX.toFixed(10))
		let canvasX = (gridX - minX) * scaleY
		let majorGridX = Math.round(gridX)
		let isMajor = Math.abs(gridX - majorGridX) < axisEpsilon

		ctx.beginPath()
		ctx.lineWidth = isMajor ? .6 : .2
		ctx.strokeStyle = "black"
		if (Math.abs(gridX) < axisEpsilon) {
			ctx.lineWidth = 2
			ctx.strokeStyle = "red"
		}
		ctx.moveTo(canvasX, 0)
		ctx.lineTo(canvasX, canvas.height)
		ctx.stroke()
		ctx.closePath()

		if (isMajor) {
			let txt = formatAxisLabel(majorGridX, unitY, xAxisSymbol)
			text2canvas(canvasX + 10, -minY * scaleX + 15, 'black', 'center', '15px arial', txt)
		}
	}
	if (angleA && angleB) drawLineSegment(new mLineSegment(angleA, angleB, true))

	arrObjects.sort(function (a, b) { return a.id - b.id })
	for (let i = arrObjects.length - 1; i >= 0; i--) {
		const item = arrObjects[i]
		if (item.type === 'point') {
			drawPoint(item)
		} else if (item.type === 'verLine') {
			drawVerLine(item)
		} else if (item.type === 'lineWithEquation') {
			drawLineWithEquation(item)
		} else if (item.type === 'lineWithPoints') {
			drawLineWithPoints(item)
		} else if (item.type === 'lineSegment') {
			drawLineSegment(item)
		} else if (item.type === 'distanceSegment') {
			drawDistanceSegment(item)
		} else if (item.type === 'circleTangent') {
			drawCircleTangent(item)
		} else if (item.type === 'sequence') {
			drawSequence(item)
		} else if (item.type === 'limit') {
			drawLimit(item)
		} else if (item.type === 'tangent') {
			drawTangent(item)
		} else if (item.type === 'tangentHX') {
			drawTangentHX(item)
		} else if (item.type === 'sectionalFunctions') {
			drawSectionalFunctions(item)
		} else if (item.type === 'function') {
			drawFunction(item)
		} else if (item.type === 'functioncomposition') {
			drawFunctionComposition(item)
		} else if (item.type === 'circleR') {
			drawCircleR(item)
		} else if (item.type === 'circle2') {
			drawCircle2(item)
		} else if (item.type === 'circle3') {
			drawCircle3(item)
		} else if (item.type === 'angle') {
			drawAngle(item)
		} else if (item.type === 'arcMeasure') {
			drawArcMeasure(item)
		} else if (item.type === 'derivative') {
			drawDerivative(item)
		} else { console.log('drawAll: Type bulunamadı.') }
	}
}

function drawPoint(point) {
	if (!point.visibility) return
	if (!Number.isFinite(Number(point.a)) || !Number.isFinite(Number(point.b))) return
	ctx.beginPath()

	let pSize
	point.id == activeElementID ? pSize = point.size + 2 : pSize = point.size
	let pColor = point.color
	if (point.temp) pColor = '#000000'

	ctx.strokeStyle = 'black'
	ctx.fillStyle = pColor
	ctx.arc((-minX + point.a / unitY) * scaleY, (-minY - point.b / unitX) * scaleX, pSize, 0, 2 * Math.PI)
	ctx.lineWidth = 1
	if (!point.temp) text2canvas((-minX + point.a / unitY) * scaleY - 10, (-minY - point.b / unitX) * scaleX - 5, pColor, 'center', 'bold 15px arial', point.name)
	ctx.fill()
	ctx.stroke()
	ctx.closePath()
}

function getCircleCanvasRadii(r) {
	return {
		x: Math.abs((r / unitY) * scaleY),
		y: Math.abs((r / unitX) * scaleX),
	}
}

function drawCircleR(circle) {
	if (!circle.visibility) return

	let sp = new mPoint(circle.A.a + circle.r, circle.A.b, true)
	drawPoint(sp)
	let sls = new mLineSegment(circle.A, sp, true)
	drawLineSegment(sls)

	let cSize
	circle.id == activeElementID ? cSize = circle.size + 1 : cSize = circle.size
	let cColor = circle.color
	if (circle.temp) cColor = '#000000'
	let canvasR = getCircleCanvasRadii(circle.r)
	ctx.beginPath()
	ctx.strokeStyle = cColor
	ctx.ellipse((-minX + circle.A.a / unitY) * scaleY, (-minY - circle.A.b / unitX) * scaleX, canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas((-minX + circle.A.a / unitY) * scaleY - canvasR.x * 0.75, (-minY - circle.A.b / unitX) * scaleX - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
	text2canvas((-minX + (circle.A.a + sp.a) / 2 / unitY) * scaleY, (-minY - (circle.A.b + sp.b) / 2 / unitX) * scaleX, cColor, 'center', 'bold 15px arial', 'r = ' + formatDisplayNumber(circle.r))
	ctx.stroke()
	ctx.closePath()
}

function drawCircle2(circle) {
	if (!circle.visibility) return

	let r = math.sqrt(math.pow(circle.B.a - circle.A.a, 2) + math.pow(circle.B.b - circle.A.b, 2))
	let cSize
	circle.id == activeElementID ? cSize = circle.size + 1 : cSize = circle.size
	let cColor = circle.color
	if (circle.temp) cColor = '#000000'
	let canvasR = getCircleCanvasRadii(r)
	ctx.beginPath()
	ctx.strokeStyle = cColor
	ctx.ellipse((-minX + circle.A.a / unitY) * scaleY, (-minY - circle.A.b / unitX) * scaleX, canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas((-minX + circle.A.a / unitY) * scaleY - canvasR.x * 0.75, (-minY - circle.A.b / unitX) * scaleX - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
	ctx.stroke()
	ctx.closePath()
}

function drawCircle3(circle) {
	if (!circle.visibility) return

	let mr = getCircle3RA(circle)
	let cSize
	circle.id == activeElementID ? cSize = circle.size + 1 : cSize = circle.size
	let cColor = circle.color
	if (circle.temp) cColor = '#000000'
	let canvasR = getCircleCanvasRadii(mr.r)
	ctx.beginPath()
	ctx.strokeStyle = cColor
	ctx.ellipse((-minX + mr.m / unitY) * scaleY, (-minY - mr.n / unitX) * scaleX, canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas((-minX + mr.m / unitY) * scaleY - canvasR.x * 0.75, (-minY - mr.n / unitX) * scaleX - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
	ctx.stroke()
	ctx.closePath()
}

function drawVerLine(vline) {
	if (!vline.visibility) return
	ctx.beginPath()

	let vlSize
	vline.id == activeElementID ? vlSize = vline.size + 1 : vlSize = vline.size
	let vlColor = vline.color

	ctx.strokeStyle = ctx.fillStyle = vlColor
	ctx.lineWidth = vlSize
	ctx.moveTo((-minX + vline.x / unitY) * scaleY, canvas.height + 100)
	ctx.lineTo((-minX + vline.x / unitY) * scaleY, -canvas.height - 100)
	text2canvas((-minX + vline.x / unitY) * scaleY + 10, 15, vlColor, 'center', 'bold 15px arial', vline.name)
	ctx.fill()
	ctx.stroke()
	ctx.closePath()
}

function drawLineWithEquation(line) {
	if (!line.visibility) return

	let mostLeft = minX * unitY
	let mostRight = (minX + canvas.width / scaleY) * unitY
	let startX
	let endX
	line.startX == null ? startX = -50000 : startX = line.startX
	line.endX == null ? endX = 50000 : endX = line.endX
	startX = Math.max(mostLeft, startX)
	endX = Math.min(mostRight, endX)
	if (startX > endX) startX = endX
	let x, y

	let lSize
	line.id == activeElementID ? lSize = line.size + 1 : lSize = line.size
	let lColor = line.color
	if (line.temp) lColor = '#000000'

	ctx.beginPath()
	ctx.strokeStyle = ctx.fillStyle = lColor
	ctx.lineWidth = lSize
	x = startX
	y = math.evaluate(line.m + "*" + x + "+" + line.n, { x: x })
	ctx.moveTo(-minX * scaleY + (x * scaleY) / unitY, -minY * scaleX - (y * scaleX) / unitX)
	x = endX
	y = math.evaluate(line.m + "*" + x + "+" + line.n, { x: x })
	ctx.lineTo(-minX * scaleY + (x * scaleY) / unitY, -minY * scaleX - (y * scaleX) / unitX)
	if (!line.temp) text2canvas((-minX + (-minY - line.n) / line.m) * scaleY + 5, 20, lColor, 'center', 'bold 15px arial', line.name)
	ctx.fill()
	ctx.stroke()
	ctx.closePath()
}

function drawLineWithPoints(pl, useOwnColorForTemp = false) {
	if (!pl.visibility) return

	let plSize
	pl.id == activeElementID ? plSize = pl.size + 1 : plSize = pl.size
	let plColor = pl.color
	if (pl.temp && !useOwnColorForTemp) plColor = '#000000'

	if (pl.A.a == pl.B.a && pl.A.b != pl.B.b) {
		ctx.beginPath()
		ctx.strokeStyle = ctx.fillStyle = plColor
		ctx.lineWidth = plSize
		ctx.moveTo((-minX + pl.A.a / unitY) * scaleY, canvas.height + 100)
		ctx.lineTo((-minX + pl.A.a / unitY) * scaleY, -canvas.height - 100)
		ctx.fill()
		ctx.stroke()
		ctx.closePath()
	} else {
		let x, y
		ctx.beginPath()
		ctx.strokeStyle = ctx.fillStyle = plColor
		ctx.lineWidth = plSize
		x = -50000
		y = math.evaluate(createLineEquation(pl.A, pl.B).m + '*x+' + createLineEquation(pl.A, pl.B).c, { x: x })
		ctx.moveTo(-minX * scaleY + (x * scaleY) / unitY, -minY * scaleX - (y * scaleX) / unitX)
		x = 50000
		y = math.evaluate(createLineEquation(pl.A, pl.B).m + '*x+' + createLineEquation(pl.A, pl.B).c, { x: x })
		ctx.lineTo(-minX * scaleY + (x * scaleY) / unitY, -minY * scaleX - (y * scaleX) / unitX)
		if (!pl.temp) text2canvas((-minX + (-minY - createLineEquation(pl.A, pl.B).c) / createLineEquation(pl.A, pl.B).m) * scaleY + 5, 20, plColor, 'center', 'bold 15px arial', pl.name)
		ctx.fill()
		ctx.stroke()
		ctx.closePath()
	}
}

function drawCircleTangent(tangent) {
	if (!tangent.visibility) return

	let tangentData = getCircleTangentLines(tangent.A, tangent.circle)
	if (!tangentData.status) return

	tangentData.lines.forEach(line => {
		line.color = tangent.color
		line.size = tangent.id == activeElementID ? tangent.size + 1 : tangent.size
		line.visibility = tangent.visibility
		drawLineWithPoints(line, true)
	})

	if (!tangent.temp) {
		let labelX = (-minX + tangent.A.a / unitY) * scaleY + 12
		let labelY = (-minY - tangent.A.b / unitX) * scaleX - 12
		text2canvas(labelX, labelY, tangent.color, 'center', 'bold 15px arial', tangent.name)
	}
}

function getFunctionPoint(funcStr, x) {
	let y = math.evaluate(funcStr, { x: x })
	if (!isFinite(y)) return null

	return {
		x: x,
		y: y,
		canvasX: -minX * scaleY + (x * scaleY) / unitY,
		canvasY: -minY * scaleX - (y * scaleX) / unitX,
	}
}

function isCanvasYVisible(canvasY) {
	return canvasY >= 0 && canvasY <= canvas.height
}

function drawFunction(func, temp = false) {
	if (!func.visibility) return
	let lastFunc = func.func
	if (func.type == 'sequence') lastFunc = lastFunc.replace(/(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g, 'x');

	let prevCanvasY = null
	const jumpThreshold = canvas.height
	let mostLeft = minX * unitY
	let mostRight = (minX + Math.round(canvas.width / scaleY) + 1) * unitY
	let startX
	let endX
	func.startX == null ? startX = -50000 : startX = func.startX
	func.endX == null ? endX = 50000 : endX = func.endX
	startX = Math.max(mostLeft, startX)
	endX = Math.min(mostRight, endX)
	if (startX > endX) startX = endX

	let fSize
	func.id == activeElementID ? fSize = func.size + 1 : fSize = func.size
	let fColor = func.color

	ctx.beginPath()
	ctx.strokeStyle = fColor
	ctx.lineWidth = fSize
	if (temp) ctx.setLineDash([2, 5])
	let firstPoint = true
	let startCanvasX = Math.max(0, Math.ceil((-minX + startX / unitY) * scaleY))
	let endCanvasX = Math.min(canvas.width, Math.floor((-minX + endX / unitY) * scaleY))
	let lastInvalidCanvasX = null

	for (let canvasX = startCanvasX; canvasX <= endCanvasX; canvasX++) {
		let x = (canvasX / scaleY + minX) * unitY
		let point = getFunctionPoint(lastFunc, x)
		if (!point) {
			firstPoint = true
			prevCanvasY = null
			lastInvalidCanvasX = canvasX
			continue
		}

		let startPoint = null
		if (firstPoint && lastInvalidCanvasX !== null && isCanvasYVisible(point.canvasY)) {
			startPoint = {
				canvasX: lastInvalidCanvasX,
				canvasY: point.canvasY > canvas.height / 2 ? canvas.height + 100 : -100,
			}
		}

		// ASIMPTOT KONTROLÜ
		if (prevCanvasY !== null && Math.abs(point.canvasY - prevCanvasY) > jumpThreshold) {
			firstPoint = true
			prevCanvasY = point.canvasY
			continue
		}

		if (firstPoint) {
			if (startPoint) {
				ctx.moveTo(startPoint.canvasX, startPoint.canvasY)
				ctx.lineTo(point.canvasX, point.canvasY)
			} else {
				ctx.moveTo(point.canvasX, point.canvasY)
			}
			firstPoint = false
		} else {
			ctx.lineTo(point.canvasX, point.canvasY)
		}

		lastInvalidCanvasX = null
		prevCanvasY = point.canvasY
	}
	ctx.stroke()
	if (temp) ctx.setLineDash([])
	ctx.closePath()
}

function drawSequence(seq) {
	if (!seq.visibility) return

	let seqColor = seq.color
	let seqSize
	seq.id == activeElementID ? seqSize = seq.size + 1 : seqSize = seq.size

	// draw Function
	drawFunction(seq, true)

	//draw Points
	for (let n = seq.start; n <= seq.end; n++) {
		ctx.beginPath()
		ctx.strokeStyle = 'black'
		ctx.fillStyle = seqColor
		ctx.lineWidth = 1
		let y = math.evaluate(seq.func, { n: n })
		ctx.arc((-minX + n / unitY) * scaleY, (-minY - y / unitX) * scaleX, seqSize, 0, 2 * Math.PI)
		text2canvas((-minX + n / unitY) * scaleY - 10, (-minY - y / unitX) * scaleX - 5, seqColor, 'center', 'bold 15px arial', seq.name + n)
		ctx.fill()
		ctx.stroke()
		ctx.closePath()
	}
}

function drawLimit(lim) {
	if (!lim.visibility) return
	drawFunction(lim)
	// Limit (.)
	let A = new mPoint(lim.approachVal, 0, true)
	let B = new mPoint(lim.approachVal, math.evaluate(lim.func, { x: A.a }), true)
	let C = new mPoint(0, math.evaluate(lim.func, { x: A.a }), true)
	let vls = new mLineSegment(A, B, true)
	let hls = new mLineSegment(B, C, true)
	A.color = B.color = C.color = vls.color = hls.color = lim.color
	drawLineSegment(vls)
	drawLineSegment(hls)
	drawPoint(A)
	drawPoint(B)
	drawPoint(C)

	if (lim.id == activeElementID) {
		// Limit (+)
		let A = new mPoint(lim.approachValRight, 0, true)
		let B = new mPoint(lim.approachValRight, math.evaluate(lim.func, { x: A.a }), true)
		let C = new mPoint(0, math.evaluate(lim.func, { x: A.a }), true)
		let vls = new mLineSegment(A, B, true)
		let hls = new mLineSegment(B, C, true)
		A.color = B.color = C.color = vls.color = hls.color = lim.color
		vls.lineDash = hls.lineDash = [2, 5]
		drawLineSegment(vls)
		drawLineSegment(hls)
		drawPoint(A)
		drawPoint(B)
		drawPoint(C)

		//limit (-)
		A = new mPoint(lim.approachValLeft, 0, true)
		B = new mPoint(lim.approachValLeft, math.evaluate(lim.func, { x: A.a }), true)
		C = new mPoint(0, math.evaluate(lim.func, { x: A.a }), true)
		vls = new mLineSegment(A, B, true)
		hls = new mLineSegment(B, C, true)
		A.color = B.color = C.color = vls.color = hls.color = lim.color
		vls.lineDash = hls.lineDash = [2, 5]
		drawLineSegment(vls)
		drawLineSegment(hls)
		drawPoint(A)
		drawPoint(B)
		drawPoint(C)
	}
}

function drawTangent(tur) {
	if (!tur.visibility) return
	drawFunction(tur)
	// Türev (.)
	let A = new mPoint(Number(tur.approachVal), 0, true)
	let B = new mPoint(Number(tur.approachVal), math.evaluate(tur.func, { x: A.a }), true)
	let C = new mPoint(0, math.evaluate(tur.func, { x: A.a }), true)
	let vls = new mLineSegment(A, B, true)
	let hls = new mLineSegment(B, C, true)
	A.color = B.color = C.color = vls.color = hls.color = tur.color
	vls.lineDash = hls.lineDash = [2, 5]
	drawLineSegment(vls)
	drawLineSegment(hls)
	drawPoint(A)
	drawPoint(B)
	drawPoint(C)

	//Teğet Doğrusu
	let m = math.evaluate(derivative(tur.func), { x: tur.approachVal })
	let c = math.evaluate(tur.func, { x: tur.approachVal }) - m * tur.approachVal
	tur.tngLine = new mLineWithEquation(m, c, true)
	if (tur.id == activeElementID) drawLineWithEquation(tur.tngLine)

}

function drawTangentHX(turHX) {
	if (!turHX.visibility) return
	drawFunction(turHX)

	// TürevH (.)
	let A1 = new mPoint(turHX.aodLine.A.a, 0, true)
	let C1 = new mPoint(0, turHX.aodLine.A.b, true)
	let vls = new mLineSegment(A1, turHX.aodLine.A, true)
	let hls = new mLineSegment(turHX.aodLine.A, C1, true)
	vls.lineDash = hls.lineDash = [2, 5]
	drawPoint(A1)
	drawPoint(turHX.aodLine.A)
	drawPoint(C1)
	drawLineSegment(vls)
	drawLineSegment(hls)

	// TürevH (+h)
	let A2 = new mPoint(turHX.aodLine.B.a, 0, true)
	let C2 = new mPoint(0, turHX.aodLine.B.b, true)
	vls = new mLineSegment(A2, turHX.aodLine.B, true)
	hls = new mLineSegment(turHX.aodLine.B, C2, true)
	vls.lineDash = hls.lineDash = [2, 5]
	drawPoint(A2)
	drawPoint(turHX.aodLine.B)
	drawPoint(C2)
	drawLineSegment(vls)
	drawLineSegment(hls)

	//Anlık Değişim Oranı
	drawLineWithPoints(new mLineWithPoints(turHX.aodLine.A, turHX.aodLine.B, true))

	//Teğet Doğrusu
	if (turHX.aodLine.A.a == turHX.aodLine.B.a && turHX.aodLine.A.b == turHX.aodLine.B.b) drawLineWithEquation(turHX.tngLine)
}

function drawDerivative(der) {
	if (!der.visibility) return
	drawFunction(der.derFunc)
	if (activeElementID == der.id) drawFunction(der.func.func, true)
}
function drawFunctionComposition(funcComp) {
	if (!funcComp.visibility) return
	drawFunction(funcComp)
}

function drawLineSegment(ls) {
	if (!ls.visibility) return
	let lsSize
	ls.id == activeElementID ? lsSize = ls.size + 1 : lsSize = ls.size
	let lsColor = ls.color
	if (ls.temp) lsColor = '#000000'
	ctx.beginPath()
	ctx.strokeStyle = lsColor
	ctx.lineWidth = lsSize
	if (ls.temp) ctx.setLineDash(ls.lineDash)
	ctx.moveTo((-minX + ls.A.a / unitY) * scaleY, (-minY - ls.A.b / unitX) * scaleX)
	ctx.lineTo((-minX + ls.B.a / unitY) * scaleY, (-minY - ls.B.b / unitX) * scaleX)
	if (!ls.temp) text2canvas((-minX + ((ls.A.a + ls.B.a) / 2) / unitY) * scaleY - 10, (-minY - ((ls.A.b + ls.B.b) / 2) / unitX) * scaleX - 10, lsColor, 'center', 'bold 15px arial', ls.name)
	ctx.stroke()
	ctx.setLineDash([])
	ctx.closePath()
}

function formatDistanceValue(value) {
	return formatDisplayNumber(value)
}

function formatAngleValue(value) {
	return formatDisplayNumber(value)
}

function drawDistanceSegment(ds) {
	if (!ds.visibility) return

	let dsColor = ds.temp ? '#000000' : ds.color
	let distance = distanceAB(ds.A, ds.B)
	let midX = (-minX + ((Number(ds.A.a) + Number(ds.B.a)) / 2) / unitY) * scaleY
	let midY = (-minY - ((Number(ds.A.b) + Number(ds.B.b)) / 2) / unitX) * scaleX
	let label = ds.temp ? formatDistanceValue(distance) + ' br' : ds.name + '=' + formatDistanceValue(distance) + ' br'
	text2canvas(midX, midY - 10, dsColor, 'center', 'bold 15px arial', label)
}

function drawMeasuredArc(arcInfo, color, lineWidth) {
	if (!arcInfo || arcInfo.span <= 0) return

	let circleData = arcInfo.circleData
	let steps = Math.max(16, Math.ceil(arcInfo.span / 6))
	let radius = circleData.r

	ctx.beginPath()
	ctx.strokeStyle = color
	ctx.lineWidth = lineWidth
	for (let i = 0; i <= steps; i++) {
		let angle = (arcInfo.startAngle + arcInfo.span * i / steps) * Math.PI / 180
		let x = (-minX + (circleData.m + radius * Math.cos(angle)) / unitY) * scaleY
		let y = (-minY - (circleData.n + radius * Math.sin(angle)) / unitX) * scaleX
		if (i == 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.stroke()
	ctx.closePath()

	let midAngle = (arcInfo.startAngle + arcInfo.span / 2) * Math.PI / 180
	let labelRadius = radius + 0.2
	let labelX = (-minX + (circleData.m + labelRadius * Math.cos(midAngle)) / unitY) * scaleY
	let labelY = (-minY - (circleData.n + labelRadius * Math.sin(midAngle)) / unitX) * scaleX
	text2canvas(labelX, labelY, color, 'center', 'bold 15px arial', formatAngleValue(arcInfo.span) + '\u00b0')
}

function drawArcMeasure(arcMeasure) {
	if (!arcMeasure.visibility) return
	let arcInfo = getPositiveArcMeasure(arcMeasure.A, arcMeasure.B, arcMeasure.circle)
	if (!arcInfo) return

	let arcColor = arcMeasure.temp ? '#000000' : arcMeasure.color
	let circleData = arcInfo.circleData
	let midAngle = (arcInfo.startAngle + arcInfo.span / 2) * Math.PI / 180
	let labelRadius = circleData.r + 0.25
	let labelX = (-minX + (circleData.m + labelRadius * Math.cos(midAngle)) / unitY) * scaleY
	let labelY = (-minY - (circleData.n + labelRadius * Math.sin(midAngle)) / unitX) * scaleX
	let label = arcMeasure.temp ? formatAngleValue(arcInfo.span) + '\u00b0' : arcMeasure.name + '=' + formatAngleValue(arcInfo.span) + '\u00b0'
	text2canvas(labelX, labelY, arcColor, 'center', 'bold 15px arial', label)
}

function drawScaledAngleArc(cx, cy, startAngle, span, radius, color, lineWidth) {
	let steps = Math.max(16, Math.ceil(span / 6))
	let radiusX = radius * scaleY / unitY
	let radiusY = radius * scaleX / unitX

	ctx.beginPath()
	ctx.strokeStyle = color
	ctx.lineWidth = lineWidth
	for (let i = 0; i <= steps; i++) {
		let angle = (startAngle + span * i / steps) * Math.PI / 180
		let x = cx + radiusX * Math.cos(angle)
		let y = cy + radiusY * Math.sin(angle)
		if (i == 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.stroke()
	ctx.closePath()
}


function drawAngle(ag) {
	if (!ag.visibility) return
	let agSize
	ag.id == activeElementID ? agSize = ag.size + 1 : agSize = ag.size
	let agColor = ag.color
	if (ag.temp) agColor = '#000000'
	// Açı
	ctx.beginPath()
	ctx.strokeStyle = agColor
	ctx.lineWidth = agSize
	ctx.moveTo((-minX + ag.A.a / unitY) * scaleY, (-minY - ag.A.b / unitX) * scaleX)
	ctx.lineTo((-minX + ag.B.a / unitY) * scaleY, (-minY - ag.B.b / unitX) * scaleX)
	ctx.lineTo((-minX + ag.C.a / unitY) * scaleY, (-minY - ag.C.b / unitX) * scaleX)
	ctx.stroke()
	ctx.closePath()

	//Sembol ve Ölçü
	let angles = calculateAngle(ag)
	let angleBetween = getAngleMeasure(ag)
	let cx = (-minX + ag.B.a / unitY) * scaleY
	let cy = (-minY - ag.B.b / unitX) * scaleX
	let startAngle = 360 - angles.angleBC
	let endAngle = startAngle + angleBetween

	drawScaledAngleArc(cx, cy, startAngle, angleBetween, 0.2, agColor, agSize + 1)
	let textAngle = (startAngle + angleBetween / 2) * Math.PI / 180
	let textRadiusX = 0.35 * scaleY / unitY
	let textRadiusY = 0.35 * scaleX / unitX
	text2canvas(cx + textRadiusX * Math.cos(textAngle), cy + textRadiusY * Math.sin(textAngle), agColor, 'center', 'bold 15px arial', ag.name + '=' + formatAngleValue(angleBetween) + '\u00b0')
}

function drawSectionalFunctions(sf) {
	if (!sf.visibility) return
	if (sf.id == activeElementID) {
		sf.secFuncs.forEach(func => {
			func.size = sf.size + 1
		})
	} else {
		sf.secFuncs.forEach(func => {
			func.size = sf.size
		})
	}
	sf.secFuncs.forEach(func => {
		drawFunction(func)
	})
}

function bileskeProcess(funcs) {
	return funcs.reduceRight((acc, f) => {
		return f.replace(/x/g, `(${acc})`)
	}, "x")
}

function isNumeric(str) {
	try {
		const result = math.evaluate(str);
		if (result === null || result === undefined) return false;
		if (typeof result === 'number') {
			return Number.isFinite(result);
		}
		if (math.isBigNumber(result)) {
			return result.isFinite();
		}
		if (math.isFraction(result)) {
			return true;
		}
		if (math.isComplex(result)) {
			return false;
		}
		return false;
	} catch (err) {
		return false;
	}
}

function isPoint(input) {
	if (typeof input !== 'string') return { status: false };

	let str = input.trim();

	if (!str.startsWith('(') || !str.endsWith(')')) {
		return { status: false };
	}

	str = str.slice(1, -1).trim();

	let parts = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < str.length; i++) {
		const ch = str[i];

		if (ch === '(') {
			depth++;
			current += ch;
		} else if (ch === ')') {
			depth--;
			if (depth < 0) return { status: false };
			current += ch;
		} else if (ch === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}

	if (current.length > 0) parts.push(current.trim());
	if (parts.length !== 2) return { status: false };

	const [aRaw, bRaw] = parts;

	if (!aRaw || !bRaw) return { status: false };
	if (!isNumeric(aRaw) || !isNumeric(bRaw)) {
		return { status: false };
	}

	try {
		const aVal = math.evaluate(aRaw);
		const bVal = math.evaluate(bRaw);

		if (!Number.isFinite(aVal) || !Number.isFinite(bVal)) {
			return { status: false };
		}

		return {
			type: "point",
			a: aVal,
			b: bVal,
			status: true
		};

	} catch {
		return { status: false };
	}
}

function isVerLine(input) {
	if (typeof input !== 'string') return { status: false };

	const str = input.trim();

	const eqCount = (str.match(/=/g) || []).length;
	if (eqCount !== 1) return { status: false };

	let [leftRaw, rightRaw] = str.split('=');
	if (!leftRaw || !rightRaw) return { status: false };

	const left = leftRaw.trim();
	const right = rightRaw.trim();

	let expr;

	if (left === 'x') {
		expr = right;
	} else if (right === 'x') {
		expr = left;
	} else {
		return { status: false };
	}

	if (!isNumeric(expr)) {
		return { status: false };
	}

	try {
		const val = math.evaluate(expr);

		if (!Number.isFinite(val)) {
			return { status: false };
		}

		return {
			type: "verLine",
			x: val,
			status: true
		};

	} catch {
		return { status: false };
	}
}

function isLineWithEquation(input) {
	if (typeof input !== 'string') return { status: false };
	if (!input.includes('y')) input = 'y=' + input
	const str = input.trim();
	const eqCount = (str.match(/=/g) || []).length;
	if (eqCount !== 1) return { status: false };

	let [leftRaw, rightRaw] = str.split('=');
	if (!leftRaw || !rightRaw) return { status: false };

	const left = leftRaw.trim();
	const right = rightRaw.trim();

	let expr;
	if (left === 'y') {
		expr = right;
	} else if (right === 'y') {
		expr = left;
	} else {
		return { status: false };
	}

	const normalized = expr.replace(/\s+/g, '');

	if (/\*\(/.test(normalized) && normalized.includes('x')) {
		return { status: false };
	}

	try {
		const node = math.parse(expr);
		const symbols = new Set();

		node.traverse(function (n) {
			if (n.isSymbolNode) {
				symbols.add(n.name);
			}
		});

		for (let s of symbols) {
			if (s !== 'x' && s !== 'e' && s !== 'pi') {
				return { status: false };
			}
		}
	} catch {
		return { status: false };
	}
	if (!normalized.includes('x')) {
		if (!isNumeric(normalized)) return { status: false };

		const nVal = math.evaluate(normalized);

		if (!Number.isFinite(nVal)) return { status: false };

		return {
			type: "lineWithEquation",
			m: 0,
			n: nVal,
			status: true
		};
	}

	const xMatch = normalized.match(/([+-]?[^x]*x)/);
	if (!xMatch) return { status: false };

	let xTerm = xMatch[0];

	let mRaw = xTerm.replace('x', '');

	if (mRaw === '' || mRaw === '+') mRaw = '1';
	if (mRaw === '-') mRaw = '-1';

	let rest = normalized.replace(xTerm, '');
	let nRaw = rest || '0';

	if (nRaw.startsWith('+')) nRaw = nRaw.slice(1);
	if (!isNumeric(mRaw) || !isNumeric(nRaw)) {
		return { status: false };
	}

	try {
		const mVal = math.evaluate(mRaw);
		const nVal = math.evaluate(nRaw);

		if (!Number.isFinite(mVal) || !Number.isFinite(nVal)) {
			return { status: false };
		}

		return {
			type: "lineWithEquation",
			m: mVal,
			n: nVal,
			status: true
		};

	} catch {
		return { status: false };
	}
}

function isLineWithPoints(input) {
	if (typeof input !== 'string') return { status: false };

	let str = input.trim();
	const match = str.match(/^doğru\s*\((.*)\)$/i);
	if (!match) return { status: false };

	let inner = match[1].trim();
	let parts = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];

		if (ch === '(') {
			depth++;
			current += ch;
		} else if (ch === ')') {
			depth--;
			if (depth < 0) return { status: false };
			current += ch;
		} else if (ch === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}

	if (current.length > 0) parts.push(current.trim());
	if (parts.length !== 2) return { status: false };

	function parsePoint(str) {
		if (!str.startsWith('(') || !str.endsWith(')')) return null;

		let inner = str.slice(1, -1).trim();

		let parts = [];
		let current = '';
		let depth = 0;

		for (let i = 0; i < inner.length; i++) {
			const ch = inner[i];

			if (ch === '(') {
				depth++;
				current += ch;
			} else if (ch === ')') {
				depth--;
				if (depth < 0) return null;
				current += ch;
			} else if (ch === ',' && depth === 0) {
				parts.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}

		if (current.length > 0) parts.push(current.trim());
		if (parts.length !== 2) return null;

		const [aRaw, bRaw] = parts;

		if (!isNumeric(aRaw) || !isNumeric(bRaw)) return null;

		try {
			const a = math.evaluate(aRaw);
			const b = math.evaluate(bRaw);

			if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

			return { x: a, y: b };
		} catch {
			return null;
		}
	}

	const p1 = parsePoint(parts[0]);
	const p2 = parsePoint(parts[1]);

	if (!p1 || !p2) return { status: false };

	return {
		type: "lineWithPoints",
		xA: p1.x,
		yA: p1.y,
		xB: p2.x,
		yB: p2.y,
		status: true
	};
}

function isLineSegment(input) {
	if (typeof input !== 'string') return { status: false };

	let str = input.trim();
	const match = str.match(/^doğruparçası\s*\((.*)\)$/i);
	if (!match) return { status: false };

	let inner = match[1].trim();

	let parts = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];

		if (ch === '(') {
			depth++;
			current += ch;
		} else if (ch === ')') {
			depth--;
			if (depth < 0) return { status: false };
			current += ch;
		} else if (ch === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}

	if (current.length > 0) parts.push(current.trim());
	if (parts.length !== 2) return { status: false };

	function parsePoint(str) {
		if (!str.startsWith('(') || !str.endsWith(')')) return null;

		let inner = str.slice(1, -1).trim();

		let parts = [];
		let current = '';
		let depth = 0;

		for (let i = 0; i < inner.length; i++) {
			const ch = inner[i];

			if (ch === '(') {
				depth++;
				current += ch;
			} else if (ch === ')') {
				depth--;
				if (depth < 0) return null;
				current += ch;
			} else if (ch === ',' && depth === 0) {
				parts.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}

		if (current.length > 0) parts.push(current.trim());
		if (parts.length !== 2) return null;

		const [aRaw, bRaw] = parts;

		if (!isNumeric(aRaw) || !isNumeric(bRaw)) return null;

		try {
			const a = math.evaluate(aRaw);
			const b = math.evaluate(bRaw);

			if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

			return { x: a, y: b };
		} catch {
			return null;
		}
	}

	const p1 = parsePoint(parts[0]);
	const p2 = parsePoint(parts[1]);

	if (!p1 || !p2) return { status: false };

	return {
		type: "lineSegment",
		xA: p1.x,
		yA: p1.y,
		xB: p2.x,
		yB: p2.y,
		status: true
	};
}

function isDistanceSegment(input) {
	if (typeof input !== 'string') return { status: false }

	let str = input.trim()
	const match = str.match(/^(uzaklık|distancesegment)\s*\((.*)\)$/i)
	if (!match) return { status: false }

	let lineSegmentData = isLineSegment('DoğruParçası(' + match[2] + ')')
	if (!lineSegmentData.status) return { status: false }

	return {
		type: 'distanceSegment',
		xA: lineSegmentData.xA,
		yA: lineSegmentData.yA,
		xB: lineSegmentData.xB,
		yB: lineSegmentData.yB,
		status: true,
	}
}

function isSequence(str) {
	const cleanStr = str.replace(/\s+/g, '');

	const diziRe = /^Dizi\(\s*(.+)\s*,\s*([^\s,]+)\s*,\s*([^\s,]+)\s*\)$/i;
	const match = cleanStr.match(diziRe);
	if (!match) return { status: false };

	let funcStr = match[1];
	const startStr = match[2];
	const endStr = match[3];

	const start = Number(startStr);
	const end = Number(endStr);
	if (!Number.isInteger(start) || start < 1) return { status: false };
	if (!Number.isInteger(end) || end < 1) return { status: false };
	const hasN = /(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/.test(funcStr);
	const isConstant = !/[a-zA-Z]/.test(funcStr);

	if (!hasN && !isConstant) return { status: false };

	const safeFunc = funcStr.replace(/(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g, 'x');
	const funcCheck = isFunction(safeFunc);
	if (!funcCheck.status) return { status: false };

	return {
		type: "sequence",
		status: true,
		func: funcStr.replace(/\s+/g, ''),
		start,
		end
	};
}

function isLimit(str) {
	const limitRe = /^\s*Limit\s*\(\s*(.+)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/i
	const limitMatch = str.match(limitRe)
	if (limitMatch) {
		const func = limitMatch[1]
		const approachVal = Number(limitMatch[2])
		return {
			type: "limit",
			status: true,
			func,
			approachVal
		}
	} else {
		return { status: false }
	}
}

function splitTopLevelArgs(inner) {
	let args = []
	let current = ''
	let depth = 0

	for (let i = 0; i < inner.length; i++) {
		let ch = inner[i]
		if (ch === '(') depth++
		if (ch === ')') depth--
		if (ch === ',' && depth === 0) {
			args.push(current.trim())
			current = ''
		} else {
			current += ch
		}
	}
	if (current.trim()) args.push(current.trim())
	return args
}

function isArcMeasureInput(str) {
	if (typeof str !== 'string') return { status: false }
	const match = str.match(/^\s*YayÖlçüsü\s*\((.*)\)\s*$/i)
	if (!match) return { status: false }

	let args = splitTopLevelArgs(match[1])
	if (args.length !== 2) return { status: false }

	return {
		type: 'arcMeasure',
		pointAName: args[0],
		pointBName: args[1],
		status: true,
	}
}

function resolvePointByName(name) {
	return arrObjects.find(item => item.type == 'point' && item.name == name) || null
}

function getCommonCircleForPoints(A, B) {
	let circlesA = getCirclesForPoint(A)
	let circlesB = getCirclesForPoint(B)
	return circlesA.find(circleA => circlesB.some(circleB => circleB.id == circleA.id)) || null
}

function isCircleTangentInput(str) {
	const match = str.match(/^\s*TeğetC\s*\((.*)\)\s*$/i)
	if (!match) return { status: false }

	let args = splitTopLevelArgs(match[1])
	if (args.length !== 2) return { status: false }

	return {
		type: 'circleTangent',
		circleName: args[0],
		pointArg: args[1],
		status: true,
	}
}

function resolveCircleByName(name) {
	return arrObjects.find(item =>
		item.name === name &&
		(item.type == 'circleR' || item.type == 'circle2' || item.type == 'circle3')
	)
}

function resolveCircleTangentPoint(pointArg) {
	let pointByName = arrObjects.find(item => item.name === pointArg && item.type == 'point')
	if (pointByName) return { status: true, point: pointByName, created: false }

	let pointData = isPoint(pointArg)
	if (!pointData.status) return { status: false }

	let existingPoint = arrObjects.find(item =>
		item.type == 'point' &&
		Number(item.a) === Number(pointData.a) &&
		Number(item.b) === Number(pointData.b)
	)
	if (existingPoint) return { status: true, point: existingPoint, created: false }

	let point = new mPoint(pointData.a, pointData.b)
	arrObjects.push(point)
	return { status: true, point: point, created: true }
}

function isReflectPointInput(str) {
	const match = str.match(/^\s*YansıtNokta\s*\((.*)\)\s*$/i)
	if (!match) return { status: false }

	let args = splitTopLevelArgs(match[1])
	if (args.length !== 2) return { status: false }

	return {
		type: 'reflectPoint',
		sourceArg: args[0],
		centerArg: args[1],
		status: true,
	}
}

function resolvePointArgument(pointArg) {
	let pointByName = arrObjects.find(item => item.name === pointArg && item.type == 'point')
	if (pointByName) return { status: true, point: pointByName, created: false }

	let pointData = isPoint(pointArg)
	if (!pointData.status) return { status: false }

	let existingPoint = arrObjects.find(item =>
		item.type == 'point' &&
		Number(item.a) === Number(pointData.a) &&
		Number(item.b) === Number(pointData.b)
	)
	if (existingPoint) return { status: true, point: existingPoint, created: false }

	let point = new mPoint(pointData.a, pointData.b)
	arrObjects.push(point)
	return { status: true, point: point, created: true }
}

function isIntersectInput(str) {
	const match = str.match(/^\s*Kesiştir\s*\((.*)\)\s*$/i)
	if (!match) return { status: false }

	let args = splitTopLevelArgs(match[1])
	if (args.length !== 2) return { status: false }

	return {
		type: 'intersectLines',
		line1Name: args[0],
		line2Name: args[1],
		status: true,
	}
}

function resolveLineByName(name) {
	return arrObjects.find(item => item.name === name && isIntersectableObject(item))
}

function isTangent(str) {
	const tangentRe = /^\s*Teğet\s*\(\s*(.+)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/i
	const tangentMatch = str.match(tangentRe)
	if (tangentMatch) {
		const func = tangentMatch[1]
		const approachVal = tangentMatch[2]
		return {
			type: "tangent",
			status: true,
			func,
			approachVal
		}
	} else {
		return { status: false }
	}
}

function isTangentHX(str) {
	const tangentReH = /^\s*TeğetH\s*\(\s*(.+)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/i
	const tangentReX = /^\s*TeğetX\s*\(\s*(.+)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/i
	const tangentMatch = str.match(tangentReH) || str.match(tangentReX)
	if (tangentMatch) {
		const func = tangentMatch[1]
		const approachVal = Number(tangentMatch[2])
		return {
			type: "tangentHX",
			status: true,
			func,
			approachVal,
			haveH: str.match(tangentReH) ? true : false
		}
	} else {
		return { status: false }
	}
}

function isDerivative(input) {
	if (typeof input !== 'string') return { status: false }
	const str = input.trim()

	// Türev(...) formatı
	const match = str.match(/^Türev\s*\((.*)\)$/i)
	if (!match) return { status: false }

	const inner = match[1].trim()
	if (!inner) return { status: false }

	let fu
	if (isFunction(inner) && !isFunctionCompositions(inner).status && !isFunctionOperations(inner).status) {
		fu = new mFunction(inner, true)
		return {
			type: "derivative",
			inner,
			subType: 'function',
			func: fu,
			status: true
		}
	}

	if (isFunctionCompositions(inner).status) {
		let funcsFound = true
		let names = arrObjects.map((item) => item.name)
		isFunctionCompositions(inner).functions.forEach(f => {
			if (!names.includes(f)) funcsFound = false
		});
		if (funcsFound) {
			let newInner = inner
			isFunctionCompositions(inner).functions.forEach(f => {
				if (!f.includes('x') && !Number.isFinite(Number(f))) {
					newInner = newInner.replaceAll(f, arrObjects.find(o => o.name === f).func)
				}
			})
			fu = new mFunction(bileskeProcess(isFunctionCompositions(newInner).functions), true)
		} else {
			showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
		}
		return {
			type: "derivative",
			inner,
			subType: "functioncompositions",
			func: fu,
			status: true
		}
	}
	if (isFunctionOperations(inner)) {
		const hepsiVarMi = isFunctionOperations(inner).functions.every(name => arrObjects.some(f => f.name === name));
		if (hepsiVarMi) {
			let comeWithFuncs = inner
			isFunctionOperations(inner).functions.forEach(f => {
				comeWithFuncs = comeWithFuncs.replaceAll(f, '(' + arrObjects.find(o => o.name === f).func + ')')
			});
			fu = new mFunction(comeWithFuncs, true)
		} else {
			showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
		}
		return {
			type: "derivative",
			inner,
			subType: "functionoperations",
			func: fu,
			status: true
		}
	}
	return { status: false }
}

function isFunctionOperations(str) {
	if (!/log|ln|sin|cos|tan|cot|sqrt/.test(str)) {
		const funcOpRe = /([+-]?\d*)([fghpqr][0-9]*)\b/gi
		const opMatches = [...str.matchAll(funcOpRe)]
		if (opMatches.length > 0) {
			const functions = []
			const coefficients = []

			for (let m of opMatches) {
				let coeffStr = m[1]
				let funcName = m[2]

				if (coeffStr === "" || coeffStr === "+") coeffStr = "+1"
				else if (coeffStr === "-") coeffStr = "-1"
				else if (!coeffStr.startsWith("+") && !coeffStr.startsWith("-")) {
					coeffStr = "+" + coeffStr
				}

				functions.push(funcName)
				coefficients.push(coeffStr)
			}
			return { type: "functionOperations", functions, coefficients, status: true }
		}
	}
	return { status: false }
}

function isFunctionCompositions(str) {
	const funcCompRe = /^\s*Bileşke\s*\((.+)\)\s*$/i
	const compMatch = str.match(funcCompRe)
	if (compMatch) {
		const inside = compMatch[1]
		const functions = inside.split(/\s*,\s*/).map(p => p.trim())
		return {
			type: "functionCompositions",
			status: true,
			functions
		}
	} else {
		return { status: false }
	}
}

function isSectionalFunctions(str) {
	if (/,/.test(str)) {
		const segments = str.split(";").map(s => s.trim()).filter(s => s.length > 0);
		const functions = [];
		const ranges = [];

		for (let seg of segments) {
			const parts = seg.split(",").map(p => p.trim());
			if (parts.length !== 2) {
				return { type: "unknown", reason: `Segment '${seg}' must be in 'func,range' format` };
			}

			const func = parts[0];
			const rangeExpr = parts[1].replace(/\s+/g, "");

			// Range parse
			function parseRange(expr) {
				let from = null, to = null, fromInclusive = false, toInclusive = false;

				// Tek nokta x=c
				let mEq = expr.match(/^x=([+-]?\d+(?:\.\d+)?)$/);
				if (mEq) {
					const c = Number(mEq[1]);
					return { from: c, to: c, fromInclusive: true, toInclusive: true };
				}

				// Tek taraflı
				let m1 = expr.match(/^x([<>=]+)(-?\d+(?:\.\d+)?)$/);
				let m2 = expr.match(/^(-?\d+(?:\.\d+)?)([<>=]+)x$/);

				if (m1) {
					const op = m1[1], num = Number(m1[2]);
					if (op === "<") return { from: null, to: num, fromInclusive: false, toInclusive: false };
					if (op === "<=") return { from: null, to: num, fromInclusive: false, toInclusive: true };
					if (op === ">") return { from: num, to: null, fromInclusive: false, toInclusive: false };
					if (op === ">=") return { from: num, to: null, fromInclusive: true, toInclusive: false };
				}

				if (m2) {
					const num = Number(m2[1]), op = m2[2];
					if (op === "<") return { from: num, to: null, fromInclusive: false, toInclusive: false };
					if (op === "<=") return { from: num, to: null, fromInclusive: true, toInclusive: false };
					if (op === ">") return { from: null, to: num, fromInclusive: false, toInclusive: false };
					if (op === ">=") return { from: null, to: num, fromInclusive: false, toInclusive: true };
				}

				// Çift taraflı
				let m3 = expr.match(/^(-?\d+(?:\.\d+)?)(<=|<)x(<=|<)(-?\d+(?:\.\d+)?)$/);
				if (m3) {
					const a = Number(m3[1]), leftOp = m3[2];
					const rightOp = m3[3], b = Number(m3[4]);

					if (a > b) return { type: "unknown", reason: `Invalid range: '${expr}'`, status: false };

					return {
						from: a,
						to: b,
						fromInclusive: leftOp === "<=",
						toInclusive: rightOp === "<="
					};
				}

				return { type: "unknown", reason: `Invalid range expression: '${expr}'`, status: false };
			}
			const range = parseRange(rangeExpr);
			if (!range || range.type === "unknown") return range;

			functions.push(func);
			ranges.push(range);
		}

		return {
			type: "sectionalFunctions",
			functions,
			ranges,
			status: true
		};
	} else {
		return { status: false }
	}
}

function isFunction(input) {
	if (typeof input !== 'string' || input.toLowerCase().includes('dizi')) return { status: false };
	let str = input.trim();
	// y= normalize
	const eqCount = (str.match(/=/g) || []).length;
	if (eqCount > 1) return { status: false };

	if (eqCount === 1) {
		const [left, right] = str.split('=').map(s => s.trim());
		if (left === 'y') str = right;
		else if (right === 'y') str = left;
		else return { status: false };
	}

	// boşluk temizle
	const expr = str.replace(/\s+/g, '');

	let compiled;
	try {
		compiled = math.compile(expr);
	} catch {
		return { status: false };
	}

	// evaluate dene
	try {
		compiled.evaluate({ x: 1 });
	} catch (err) {
		const msg = err.message.toLowerCase();

		// SADECE undefined variable ise reject
		if (msg.includes('undefined symbol') || msg.includes('not defined')) {
			return { status: false };
		}
	}

	return {
		type: "function",
		func: input.trim(),
		status: true
	};
}

function isCircleR(input) {
	if (typeof input !== 'string') return { status: false }

	// boşlukları temizle
	const str = input.replace(/\s+/g, '')

	// Çember(...) kontrolü
	const match = str.match(/^Çember\((.*)\)$/i)
	if (!match) return { status: false }

	const inner = match[1]

	// SON virgülü bul (iç içe parantezler için)
	let depth = 0
	let splitIndex = -1

	for (let i = inner.length - 1; i >= 0; i--) {
		if (inner[i] === ')') depth++
		else if (inner[i] === '(') depth--
		else if (inner[i] === ',' && depth === 0) {
			splitIndex = i
			break
		}
	}

	if (splitIndex === -1) return { status: false }

	const pointStr = inner.slice(0, splitIndex)
	const rStr = inner.slice(splitIndex + 1)

	// (a,b) kontrolü
	const point = isPoint(pointStr)
	if (!point.status) return { status: false }

	// r kontrolü
	if (!isNumeric(rStr)) return { status: false }

	let r
	try {
		r = math.evaluate(rStr)
	} catch {
		return { status: false }
	}

	// yarıçap > 0 olmalı
	if (!isFinite(r) || r < 0) return { status: false }

	return {
		type: "circleR",
		a: point.a,
		b: point.b,
		r: r,
		status: true
	}
}

function isCircle2(input) {
	if (typeof input !== 'string') return { status: false }

	const str = input.replace(/\s+/g, '')

	const match = str.match(/^Çember\((.*)\)$/i)
	if (!match) return { status: false }

	const inner = match[1]

	// depth ile doğru virgülü bul
	let depth = 0
	let splitIndex = -1

	for (let i = 0; i < inner.length; i++) {
		if (inner[i] === '(') depth++
		else if (inner[i] === ')') depth--
		else if (inner[i] === ',' && depth === 0) {
			splitIndex = i
			break
		}
	}

	if (splitIndex === -1) return { status: false }

	const centerStr = inner.slice(0, splitIndex)
	const pointStr = inner.slice(splitIndex + 1)

	// merkez kontrolü
	const center = isPoint(centerStr)
	if (!center.status) return { status: false }

	// çember üzerindeki nokta kontrolü
	const point = isPoint(pointStr)
	if (!point.status) return { status: false }

	// yarıçap hesapla
	const dx = point.a - center.a
	const dy = point.b - center.b
	const r = Math.sqrt(dx * dx + dy * dy)

	// r > 0 olmalı
	if (!isFinite(r) || r < 0) return { status: false }

	return {
		type: "circle2",
		m: center.a,
		n: center.b,
		a: point.a,
		b: point.b,
		r: r,
		status: true
	}
}

function isCircle3(input) {
	if (typeof input !== 'string') return { status: false }

	const str = input.replace(/\s+/g, '')

	const match = str.match(/^Çember\((.*)\)$/i)
	if (!match) return { status: false }

	const inner = match[1]

	// depth ile virgülleri bul
	let depth = 0
	let splits = []

	for (let i = 0; i < inner.length; i++) {
		if (inner[i] === '(') depth++
		else if (inner[i] === ')') depth--
		else if (inner[i] === ',' && depth === 0) {
			splits.push(i)
		}
	}

	// tam 2 virgül olmalı
	if (splits.length !== 2) return { status: false }

	const p1Str = inner.slice(0, splits[0])
	const p2Str = inner.slice(splits[0] + 1, splits[1])
	const p3Str = inner.slice(splits[1] + 1)

	// noktaları parse et
	const p1 = isPoint(p1Str)
	const p2 = isPoint(p2Str)
	const p3 = isPoint(p3Str)

	if (!p1.status || !p2.status || !p3.status) return { status: false }

	// aynı noktalar olamaz
	if (
		(p1.a === p2.a && p1.b === p2.b) ||
		(p1.a === p3.a && p1.b === p3.b) ||
		(p2.a === p3.a && p2.b === p3.b)
	) {
		return { status: false }
	}

	// COLLINEAR KONTROLÜ (alan = 0)
	const area =
		p1.a * (p2.b - p3.b) +
		p2.a * (p3.b - p1.b) +
		p3.a * (p1.b - p2.b)

	if (Math.abs(area) < 1e-10) return { status: false }

	return {
		type: "circle3",
		ax: p1.a,
		ay: p1.b,
		bx: p2.a,
		by: p2.b,
		cx: p3.a,
		cy: p3.b,
		status: true
	}
}

function isAngle(input) {
	if (typeof input !== 'string') return { status: false }

	const str = input.replace(/\s+/g, '')

	const match = str.match(/^Açı\((.*)\)$/i)
	if (!match) return { status: false }

	const inner = match[1]

	// depth ile virgülleri bul
	let depth = 0
	let splits = []

	for (let i = 0; i < inner.length; i++) {
		if (inner[i] === '(') depth++
		else if (inner[i] === ')') depth--
		else if (inner[i] === ',' && depth === 0) {
			splits.push(i)
		}
	}

	// tam 2 virgül olmalı
	if (splits.length !== 2) return { status: false }

	const p1Str = inner.slice(0, splits[0])
	const p2Str = inner.slice(splits[0] + 1, splits[1])
	const p3Str = inner.slice(splits[1] + 1)

	// noktaları parse et
	const p1 = isPoint(p1Str)
	const p2 = isPoint(p2Str)
	const p3 = isPoint(p3Str)

	if (!p1.status || !p2.status || !p3.status) return { status: false }

	// köşe ile diğer noktalar aynı olamaz
	if (
		(p1.a === p2.a && p1.b === p2.b) ||
		(p3.a === p2.a && p3.b === p2.b)
	) {
		return { status: false }
	}

	return {
		type: "angle",
		ax: p1.a,
		ay: p1.b,
		bx: p2.a,
		by: p2.b,
		cx: p3.a,
		cy: p3.b,
		status: true
	}
}

function isObjectUsedByOther(target) {
	if (target.onOther && target.onOther.length > 0) return true

	return arrObjects.some(obj => {
		if (obj.id === target.id) return false
		if (obj.A?.id === target.id) return true
		if (obj.B?.id === target.id) return true
		if (obj.C?.id === target.id) return true
		if (obj.circle?.id === target.id) return true

		return obj.onOther?.some(dep =>
			dep.circleId === target.id ||
			dep.lineId === target.id ||
			dep.tangentId === target.id ||
			dep.angleId === target.id ||
			dep.sourceId === target.id ||
			dep.centerId === target.id ||
			dep.line1Id === target.id ||
			dep.line2Id === target.id ||
			dep.ownerId === target.id
		)
	})
}

function labelsCreator() {
	reprojectAllOnOther()
	objectsContainer.innerHTML = ""
	arrObjects.forEach(item => {
		if (item.hideInLabels) return
		let emptyDiv = document.createElement('div')
		let exprDiv = document.createElement('div')
		exprDiv.classList = 'expr-block'
		let input = document.createElement('input')
		input.id = item.id + '-input'
		input.readOnly = true
		let output = document.createElement('output')
		output.id = item.id + '-output'

		let btnGizle = document.createElement('button')
		btnGizle.classList = 'btn gizle'
		item.visibility ? btnGizle.title = 'Gizle' : btnGizle.title = 'Göster'
		item.visibility ? btnGizle.style.background = item.color : btnGizle.style.background = 'transparent'

		let btnSil = document.createElement('button')
		btnSil.classList = 'btn sil'
		btnSil.title = 'Sil'
		btnSil.hidden = isObjectUsedByOther(item)

		let sliderDiv = document.createElement('div')
		sliderDiv.classList = 'sliders'

		let labelA = document.createElement('label')
		labelA.id = item.id + '-labelA'
		labelA.htmlFor = item.id + '-sliderA'
		labelA.style.width = '50px'

		let sliderA = document.createElement('input')
		sliderA.type = "range"
		sliderA.id = item.id + '-sliderA'
		sliderA.step = "0.01"

		let labelB = document.createElement('label')
		labelB.id = item.id + '-labelB'
		labelB.htmlFor = item.id + '-sliderB'
		labelB.style.width = '50px'

		let sliderB = document.createElement('input')
		sliderB.type = "range"
		sliderB.id = item.id + '-sliderB'
		sliderB.step = "0.01"

		labelA.hidden = false
		sliderA.hidden = false
		labelB.hidden = false
		sliderB.hidden = false

		input.addEventListener('click', () => changeActiveElement(input.id))
		btnSil.addEventListener('click', (e) => delBtnClick(e))
		btnGizle.addEventListener('click', (e) => visibilityBtnClick(e))

		sliderA.addEventListener('pointerdown', beginSliderHistory)
		sliderB.addEventListener('pointerdown', beginSliderHistory)
		sliderA.addEventListener('keydown', beginSliderHistory)
		sliderB.addEventListener('keydown', beginSliderHistory)
		sliderA.addEventListener('input', () => crossSlider())
		sliderB.addEventListener('input', () => crossSlider())
		sliderA.addEventListener('change', commitSliderHistory)
		sliderB.addEventListener('change', commitSliderHistory)

		output.innerHTML = ''
		if (item.type == 'point') {
			let reflectConstraint = getReflectPointConstraint(item)
			let intersectionConstraint = getIntersectionPointConstraint(item)
			let circleTangentTouchPointConstraint = getCircleTangentTouchPointConstraint(item)
			if (reflectConstraint) {
				let source = arrObjects.find(obj => obj.id == reflectConstraint.sourceId)
				let center = arrObjects.find(obj => obj.id == reflectConstraint.centerId)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = 'YansıtNokta(' + (source ? source.name : '?') + ',' + (center ? center.name : '?') + ')'
				output.value = item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
			} else if (intersectionConstraint) {
				let line1 = arrObjects.find(obj => obj.id == intersectionConstraint.line1Id)
				let line2 = arrObjects.find(obj => obj.id == intersectionConstraint.line2Id)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = item.name + '=Kesiştir(' + (line1 ? line1.name : '?') + ',' + (line2 ? line2.name : '?') + ')'
				output.innerHTML = getIntersectionOutput(item)
			} else if (circleTangentTouchPointConstraint) {
				let tangent = arrObjects.find(obj => obj.id == circleTangentTouchPointConstraint.tangentId)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = item.name + '=Te\u011fetNokta(' + (tangent ? tangent.name : '?') + ',' + ((circleTangentTouchPointConstraint.pointIndex || 0) + 1) + ')'
				output.value = item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
			} else {
				input.value = item.name + '=' + formatPointPair(item)
			}
		} else if (item.type == 'verLine') {
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ": x = " + formatDisplayNumber(item.x)
		} else if (item.type == 'circleR') {
			labelB.hidden = true
			sliderB.hidden = true
			input.value = formatCircleInput(item)
		} else if (item.type == 'circle2') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = formatCircleInput(item)
		} else if (item.type == 'circle3') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = formatCircleInput(item)
		} else if (item.type == 'angle') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ': Açı(' + item.A.name + ',' + item.B.name + ',' + item.C.name + ')'
			output.value = item.name + '=' + formatAngleValue(getAngleMeasure(item)) + '°'
		} else if (item.type == 'arcMeasure') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			let arcInfo = getPositiveArcMeasure(item.A, item.B, item.circle)
			input.value = item.name + ': YayÖlçüsü(' + item.A.name + ',' + item.B.name + ')'
			output.value = item.name + '=' + (arcInfo ? formatAngleValue(arcInfo.span) + '\u00b0' : '?')
		} else if (item.type == 'lineWithEquation') {
			let lineEquation = item.name + ': y = ' + formatDisplayNumber(item.m) + 'x + ' + formatDisplayNumber(item.n)
			lineEquation = lineEquation.replace('+ -', '- ')
			lineEquation = lineEquation.replace('1x', 'x')
			lineEquation = lineEquation.replace('0x ', '')
			lineEquation = lineEquation.replace(' + 0', '')
			input.value = lineEquation
		} else if (item.type == 'lineWithPoints') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ': ' + 'Doğru(' + formatPointPair(item.A) + ', ' + formatPointPair(item.B) + ')'
			if (item.A.a == item.B.a && item.A.b != item.B.b) {
				output.value = "x = " + formatDisplayNumber(item.A.a)
			} else if (item.A.b == item.B.b) {
				output.innerHTML = ''
			}
			else {
				output.value = "y = " + normalizeLine(createLineEquation(item.A, item.B).m, createLineEquation(item.A, item.B).c)
			}
		} else if (item.type == 'lineSegment') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ': ' + 'DoğruParçası(' + formatPointPair(item.A) + ', ' + formatPointPair(item.B) + ')'
		} else if (item.type == 'distanceSegment') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ': Uzaklık(' + formatPointPair(item.A) + ', ' + formatPointPair(item.B) + ')'
		} else if (item.type == 'circleTangent') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			input.value = item.name + ': Teğet(' + item.A.name + ',' + item.circle.name + ')'
		} else if (item.type == 'sequence') {
			input.value = item.name + 'ₙ = Dizi(' + item.func + ',' + item.start + ',' + item.end + ')'
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else if (item.type == 'limit') {
			input.value = item.name + ' = Limit(' + item.func + ',' + item.approachVal + ')'
		} else if (item.type == 'tangent') {
			input.value = 'Teğet(' + item.func + ',' + item.approachVal + ')'
			output.value = item.name + ': y = ' + item.tngLine.func
			labelB.hidden = true
			sliderB.hidden = true
		} else if (item.type == 'tangentHX') {

			let tan, eq
			if (item.aodLine.A.a == item.aodLine.B.a && item.aodLine.A.b == item.aodLine.B.b) {
				eq = item.name + "'(" + item.approachVal + ")="
				tan = formatDisplayNumber(item.tngLine.m)
			} else {
				eq = ''
				tan = formatDisplayNumber(createLineEquation(item.aodLine.A, item.aodLine.B).m)
			}

			let N = item.haveH ? 'H' : 'X'
			input.value = 'Teğet' + N + '(' + item.func + ',' + item.approachVal + ')'
			if (item.haveH) output.value = '[' + item.name + '(' + item.approachVal + '+h) - ' + item.name + '(' + item.approachVal + ')] / h = ' + eq + tan
			if (!item.haveH) output.value = '[' + item.name + '(' + item.h + ') - ' + item.name + '(x₀)] /(' + item.h + '-x₀)  = ' + eq + tan
		} else if (item.type == 'sectionalFunctions') {
			input.value = item.name + '(x) = {' + item.cmd + '}'
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else if (item.type == 'function') {
			input.value = item.name + ': y = ' + item.func
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else if (item.type == 'functioncomposition') {
			input.value = 'Bileşke(' + item.funcs.join(',') + ')'
			output.value = item.name + ': y = ' + item.func
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else if (item.type == 'derivative') {
			input.value = item.name + ': y = ' + item.func.func.func
			output.value = item.derFunc.name + ': y = ' + item.derFunc.func
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else {
			console.log('labelsCreator: Type bulunamadı.')
		}
		sliderA.min = minX * unitY - 1
		sliderA.max = (minX + Math.round(canvas.width / scaleY) + 1) * unitY
		sliderB.max = -minY * unitX + 1
		sliderB.min = (minY + Math.round(canvas.height / scaleX) + 1) * -unitX
		if (item.type == 'point') {
			sliderA.value = item.a
			labelA.innerHTML = 'a = ' + formatDisplayNumber(item.a)
			sliderB.value = item.b
			labelB.innerHTML = 'b = ' + formatDisplayNumber(item.b)
		} else if (item.type == 'verLine') {
			sliderA.value = item.x
			labelA.innerHTML = 'x = ' + formatDisplayNumber(item.x)
		} else if (item.type == 'circleR') {
			sliderA.min = 0
			sliderA.max = (minX + Math.round(canvas.width / scaleY) + 1) * unitY
			sliderA.value = item.r
			labelA.innerHTML = 'r = ' + formatDisplayNumber(item.r)
		} else if (item.type == 'arcMeasure') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			let arcInfo = getPositiveArcMeasure(item.A, item.B, item.circle)
			input.value = item.name + ': YayÖlçüsü(' + item.A.name + ',' + item.B.name + ')'
			output.value = item.name + '=' + (arcInfo ? formatAngleValue(arcInfo.span) + '\u00b0' : '?')
		} else if (item.type == 'lineWithEquation') {
			sliderA.value = item.m
			labelA.innerHTML = 'm = ' + formatDisplayNumber(item.m)
			sliderB.value = item.n
			labelB.innerHTML = 'n = ' + formatDisplayNumber(item.n)
		} else if (item.type == 'limit') {
			let verticalMNumberRight = formatDisplayNumber(item.approachValRight * 1)
			let verticalMNumberLeft = formatDisplayNumber(item.approachValLeft * 1)
			let mostLeft = minX * unitY
			let mostRight = (minX + Math.round(canvas.width / scaleY) + 1) * unitY

			sliderA.min = item.approachVal * 1
			sliderA.max = mostRight
			sliderA.value = verticalMNumberRight
			labelA.innerHTML = sliderA.min + '⁺ = ' + verticalMNumberRight

			sliderB.min = mostLeft
			sliderB.max = item.approachVal * 1
			sliderB.value = verticalMNumberLeft
			labelB.innerHTML = sliderB.max + '⁻ = ' + verticalMNumberLeft
		} else if (item.type == 'tangent') {
			let mostLeft = minX * unitY
			let mostRight = (minX + Math.round(canvas.width / scaleY) + 1) * unitY
			sliderA.min = mostLeft
			sliderA.max = mostRight
			sliderA.step = "0.01"
			sliderA.value = item.approachVal
			labelA.innerHTML = 'x = ' + item.approachVal
		} else if (item.type == 'tangentHX') {
			let mostLeft = minX * unitY
			let mostRight = (minX + Math.round(canvas.width / scaleY) + 1) * unitY
			sliderA.min = mostLeft
			sliderA.max = mostRight
			sliderA.step = "1"
			sliderA.value = item.approachVal
			labelA.innerHTML = 'x₀ = ' + item.approachVal
			sliderB.step = "0.1"
			item.haveH ? sliderB.min = 0 : sliderB.min = mostLeft
			item.haveH ? sliderB.max = 10 : sliderB.max = mostRight
			sliderB.value = item.h
			item.haveH ? labelB.innerHTML = 'h = ' + item.h : labelB.innerHTML = 'x = ' + item.h
		}

		if (item.id != activeElementID) {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else {
			input.style.backgroundColor = '#eaf3ff'
			output.style.backgroundColor = '#f2f7ff'
		}

		sliderDiv.appendChild(labelA)
		sliderDiv.appendChild(sliderA)
		sliderDiv.appendChild(labelB)
		sliderDiv.appendChild(sliderB)
		exprDiv.appendChild(input)
		exprDiv.appendChild(output)
		exprDiv.appendChild(btnGizle)
		exprDiv.appendChild(btnSil)
		emptyDiv.appendChild(exprDiv)
		emptyDiv.appendChild(sliderDiv)
		emptyDiv.appendChild(document.createElement('hr'))
		objectsContainer.prepend(emptyDiv)
	})
}

function toggleCalcIcon(imgEl) {
	if (!imgEl) return

	imgEl.classList.toggle('panel-hidden')

	const btnCalc = document.getElementById('btnCalc')
	const isPanelHidden = imgEl.classList.contains('panel-hidden')

	if (btnCalc) {
		btnCalc.title = isPanelHidden ? 'Paneli Göster' : 'Paneli Gizle'
	}
}

function updateCalcButtonPosition() {
	let rightToolbar = document.getElementById('rightToolbar')
	let rightWrapper = document.getElementById('rightWrapper')
	if (!rightToolbar || !rightWrapper) return

	let rightValue = rightWrapper.classList.contains('hide') ? '0px' : rightWrapper.getBoundingClientRect().width + 'px'
	rightToolbar.style.right = rightValue
}

function observeRightWrapperSize() {
	let rightWrapper = document.getElementById('rightWrapper')
	if (!rightWrapper || typeof ResizeObserver === 'undefined') return

	let rightWrapperObserver = new ResizeObserver(updateToolWrapperRight)
	rightWrapperObserver.observe(rightWrapper)
	rightWrapper.addEventListener('transitionend', updateToolWrapperRight)
}

function updateToolWrapperRight() {
	let rightWrapper = document.getElementById('rightWrapper')
	if (!rightWrapper) return
	updateCalcButtonPosition()
}

function saveStandartView() {
	standartView = {
		scaleX,
		scaleY,
		minX,
		minY,
		tickX,
		tickY
	}
}

function resetStandartView() {
	scaleX = standartView.scaleX
	scaleY = standartView.scaleY
	minX = standartView.minX
	minY = standartView.minY
	tickX = standartView.tickX
	tickY = standartView.tickY
	unitX = verticalUnits[tickX]
	unitY = horizontalUnits[tickY]

	panStartMouse = null
	axisUnitDrag = null

	drawAll()
}

function closeHelp() {
	activeObject = 'select'
	document.getElementById('help-popup').style.display = 'none';
}

function initializeHelpMenu() {
	const helpPopup = document.getElementById('help-popup')
	const helpContent = document.querySelector('.help-content')
	const helpHeader = document.getElementById('help-header')
	const helpSection = document.querySelector('.help-section')
	if (!helpPopup || !helpContent || !helpHeader || !helpSection) return

	if (!document.getElementById('helpSearch')) {
		const searchWrap = document.createElement('div')
		searchWrap.className = 'help-search'

		const searchInput = document.createElement('input')
		searchInput.id = 'helpSearch'
		searchInput.type = 'search'
		searchInput.placeholder = 'Komut ara...'
		searchInput.autocomplete = 'off'

		searchWrap.appendChild(searchInput)
		helpHeader.after(searchWrap)

		searchInput.addEventListener('input', () => filterHelpTopics(searchInput.value))
	}

	if (!helpSection.classList.contains('is-accordion-ready')) {
		helpSection.classList.add('is-accordion-ready')
		const sectionChildren = Array.from(helpSection.children)
		const topicTitles = sectionChildren.filter(child => child.tagName == 'H4')

		topicTitles.forEach((title, index) => {
			const details = document.createElement('details')
			details.className = 'help-topic'
			if (index == 0) details.open = true

			const summary = document.createElement('summary')
			summary.textContent = title.textContent

			const body = document.createElement('div')
			body.className = 'help-topic-body'

			let next = title.nextElementSibling
			while (next && next.tagName != 'H4') {
				const current = next
				next = next.nextElementSibling
				body.appendChild(current)
			}

			details.appendChild(summary)
			details.appendChild(body)
			title.replaceWith(details)
		})
	}

	if (!helpPopup.dataset.backdropCloseReady) {
		helpPopup.dataset.backdropCloseReady = 'true'
		helpPopup.addEventListener('click', (event) => {
			if (event.target == helpPopup) closeHelp()
		})
	}
}

function filterHelpTopics(query) {
	const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR')
	const topics = document.querySelectorAll('.help-topic')

	topics.forEach(topic => {
		const matches = normalizedQuery == '' || topic.textContent.toLocaleLowerCase('tr-TR').includes(normalizedQuery)
		topic.hidden = !matches
		if (normalizedQuery != '' && matches) topic.open = true
	})
}

function getCommandSuggestionItems() {
	const examples = Array.from(document.querySelectorAll('code.example'))
	const uniqueCommands = new Map()

	examples.forEach(example => {
		const command = example.textContent.trim()
		if (!command || uniqueCommands.has(command)) return

		const topic = example.closest('.help-topic')
		const topicTitle = topic?.querySelector('summary')?.textContent?.trim() || ''
		uniqueCommands.set(command, {
			command: command,
			topic: topicTitle,
			searchText: (command + ' ' + topicTitle).toLocaleLowerCase('tr-TR')
		})
	})

	return Array.from(uniqueCommands.values())
}

function ensureCommandSuggestionsBox(giris) {
	let suggestionsBox = document.getElementById('commandSuggestions')
	if (suggestionsBox) return suggestionsBox

	suggestionsBox = document.createElement('div')
	suggestionsBox.id = 'commandSuggestions'
	suggestionsBox.className = 'command-suggestions'
	suggestionsBox.hidden = true
	giris.insertAdjacentElement('afterend', suggestionsBox)
	return suggestionsBox
}

function hideCommandSuggestions() {
	const suggestionsBox = document.getElementById('commandSuggestions')
	if (suggestionsBox) suggestionsBox.hidden = true
}

function renderCommandSuggestions(giris) {
	const suggestionsBox = ensureCommandSuggestionsBox(giris)
	const query = giris.value.trim().toLocaleLowerCase('tr-TR')

	if (!query) {
		hideCommandSuggestions()
		return
	}

	const matches = getCommandSuggestionItems()
		.filter(item => item.searchText.includes(query))
		.slice(0, 8)

	if (matches.length == 0) {
		hideCommandSuggestions()
		return
	}

	suggestionsBox.replaceChildren()
	matches.forEach(item => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'command-suggestion'
		const commandText = document.createElement('span')
		commandText.textContent = item.command
		button.appendChild(commandText)
		if (item.topic) {
			const topicText = document.createElement('small')
			topicText.textContent = item.topic
			button.appendChild(topicText)
		}
		button.addEventListener('mousedown', event => event.preventDefault())
		button.addEventListener('click', () => {
			giris.value = item.command
			hideCommandSuggestions()
			giris.focus()
		})
		suggestionsBox.appendChild(button)
	})

	suggestionsBox.hidden = false
}

function initializeCommandSuggestions() {
	const giris = document.getElementById('giris')
	if (!giris || giris.dataset.commandSuggestionsReady) return

	giris.dataset.commandSuggestionsReady = 'true'
	ensureCommandSuggestionsBox(giris)

	giris.addEventListener('input', () => renderCommandSuggestions(giris))
	giris.addEventListener('focus', () => renderCommandSuggestions(giris))
	giris.addEventListener('keydown', event => {
		if (event.key == 'Escape') hideCommandSuggestions()
	})

	document.addEventListener('click', event => {
		if (event.target == giris || event.target.closest('#commandSuggestions')) return
		hideCommandSuggestions()
	})
}

const helpMenuButton = document.getElementById('helpMenuButton')
const commandInput = document.getElementById('giris')

commandInput.addEventListener('keydown', girisKeyDown)
commandInput.addEventListener('input', handleParanthesis)
document.querySelector('.help-close').addEventListener('click', () => {
	document.getElementById('help-popup').style.display = 'none'
})

initializeCommandSuggestions()

if (helpMenuButton) {
	helpMenuButton.addEventListener('click', () => {
		initializeHelpMenu()
		document.getElementById('help-popup').style.display = 'flex'

		const giris = document.getElementById('giris')
		if (giris) giris.value = ''
		const helpSearch = document.getElementById('helpSearch')
		if (helpSearch) {
			helpSearch.value = ''
			filterHelpTopics('')
			helpSearch.focus()
		}
	})
}









function changeActiveElement(id) {
	let clickedid = Number(id.substring(0, id.indexOf("-")))
	if (activeElementID != null) document.getElementById(activeElementID + '-input').style.background = '#ffffff'
	if (activeElementID != null) document.getElementById(activeElementID + '-output').style.background = '#fbfcff'

	let sliders = document.querySelectorAll("input[type='range']");
	sliders.forEach(slider => {
		slider.hidden = true
	})
	let labels = document.querySelectorAll("label");
	labels.forEach(label => {
		label.hidden = true
	})
	activeElementID = clickedid
	document.getElementById(activeElementID + '-input').style.background = '#eaf3ff'
	document.getElementById(activeElementID + '-output').style.background = '#f2f7ff'
	let activeitem = arrObjects.find(item => item.id == activeElementID)

	document.getElementById(activeElementID + '-labelA').hidden = false
	document.getElementById(activeElementID + '-sliderA').hidden = false
	document.getElementById(activeElementID + '-labelB').hidden = false
	document.getElementById(activeElementID + '-sliderB').hidden = false

	if (activeitem.type == 'tangent' || activeitem.type == "verLine" || activeitem.type == 'circleR') {
		document.getElementById(activeElementID + '-labelB').hidden = true
		document.getElementById(activeElementID + '-sliderB').hidden = true
	}
	if (getReflectPointConstraint(activeitem) || getIntersectionPointConstraint(activeitem) || getCircleTangentTouchPointConstraint(activeitem) || activeitem.type == 'sequence' || activeitem.type == 'lineSegment' || activeitem.type == 'distanceSegment' || activeitem.type == 'circleTangent' || activeitem.type == 'lineWithPoints' || activeitem.type == 'sectionalFunctions' || activeitem.type == 'function' || activeitem.type == 'circle2' || activeitem.type == 'circle3' || activeitem.type == 'angle' || activeitem.type == 'arcMeasure' || activeitem.type == 'functioncomposition' || activeitem.type == 'derivative') {
		document.getElementById(activeElementID + '-labelA').hidden = true
		document.getElementById(activeElementID + '-sliderA').hidden = true
		document.getElementById(activeElementID + '-labelB').hidden = true
		document.getElementById(activeElementID + '-sliderB').hidden = true
	}
	drawAll()
}

function handleParanthesis(e) {
	const el = e.target
	const pairs = {
		'(': ')',
		'[': ']',
		'{': '}'
	}
	// --- Açılış parantezi yazma ---
	if (pairs[e.key]) {
		e.preventDefault()
		const start = el.selectionStart
		const end = el.selectionEnd
		const value = el.value
		const open = e.key
		const close = pairs[e.key]
		const selectedText = value.slice(start, end)

		el.value = value.slice(0, start) + open + selectedText + close + value.slice(end);

		if (selectedText) {
			el.selectionStart = start + 1
			el.selectionEnd = end + 1
		} else {
			el.selectionStart = el.selectionEnd = start + 1
		}
	}

	// --- Backspace ile silme kontrolü ---
	if (e.key === "Backspace") {
		const start = el.selectionStart
		const end = el.selectionEnd
		const value = el.value

		// Seçim varsa normal silmeye izin ver
		if (start !== end) return

		// Sol karakter bir açılış parantezi mi?
		const prevChar = value[start - 1]
		const nextChar = value[start]

		if (pairs[prevChar] && nextChar === pairs[prevChar]) {
			e.preventDefault()
			el.value = value.slice(0, start - 1) + value.slice(start + 1)
			el.selectionStart = el.selectionEnd = start - 1
		}
	}
}

function delBtnClick(e) {
	let elementid = e.target.closest("div").children[0].id
	let delid = elementid.substring(0, elementid.indexOf("-"))

	arrObjects = arrObjects.filter(item => item.id !== Number(delid));
	commitHistoryState()

	activeElementID = null
	activeObject = 'select'

	drawAll()
	labelsCreator()
}

function visibilityBtnClick(e) {
	let elementid = e.target.closest("div").children[0].id
	changeActiveElement(elementid)
	let activeitem = arrObjects.find(item => item.id == activeElementID)
	if (activeitem.visibility == true) {
		activeitem.visibility = false
		e.target.style.background = 'transparent'
	} else {
		activeitem.visibility = true
		e.target.style.background = activeitem.color
	}
	commitHistoryState()
	drawAll()
}

function getMousePos(evt) {
	let rect = canvas.getBoundingClientRect()
	let xx = (evt.clientX - rect.left + minX * scaleY) / scaleY
	let yy = (evt.clientY - rect.top + minY * scaleX) / -scaleX

	let intRoundXX = Math.round(xx)
	let fixRoundXX = Number(xx).toFixed(2)

	if (Math.abs(intRoundXX - fixRoundXX) < .1) {
		xx = intRoundXX
	} else {
		xx = fixRoundXX
	}

	let intRoundYY = Math.round(yy)
	let fixRoundYY = Number(yy).toFixed(2)
	if (Math.abs(intRoundYY - fixRoundYY) < .1) {
		yy = intRoundYY
	} else {
		yy = fixRoundYY
	}

	return { x: xx * unitY, y: yy * unitX }
}

function crossSlider() {
	if (activeElementID != null) {
		let sliderA = document.getElementById(activeElementID + '-sliderA')
		let sliderB = document.getElementById(activeElementID + '-sliderB')
		let labelA = document.getElementById(activeElementID + '-labelA')
		let labelB = document.getElementById(activeElementID + '-labelB')
		let input = document.getElementById(activeElementID + '-input')
		let output = document.getElementById(activeElementID + '-output')
		let item = arrObjects.find(item => item.id == activeElementID)

		if (getReflectPointConstraint(item) || getIntersectionPointConstraint(item)) {
			labelsCreator()
			drawAll()
			return
		}

		if (item.type == 'point') {
			item.a = Number(sliderA.value)
			item.b = Number(sliderB.value)
			labelA.innerHTML = 'a = ' + formatDisplayNumber(item.a)
			labelB.innerHTML = 'b = ' + formatDisplayNumber(item.b)
			input.value = item.name + '=' + formatPointPair(item)

			let ownerS = arrObjects.filter(obj => {
				const validTypes = ['lineSegment', 'distanceSegment', 'lineWithPoints', 'circle', 'circle2', 'circle3', 'angle', 'arcMeasure'];
				if (!validTypes.includes(obj.type)) return false;
				return ["A", "B", "C"].some(key => obj[key]?.name === item.name);
			});

			ownerS.forEach(owner => {
				if (owner.A.name === item.name) {
					owner.A.a = item.a
					owner.A.b = item.b
				} else if (owner.B.name === item.name) {
					owner.B.a = item.a
					owner.B.b = item.b
				} else if (owner.C.name === item.name) {
					owner.C.a = item.a
					owner.C.b = item.b
				}
				let inputOwner = document.getElementById(owner.id + '-input')
				if (owner.type === 'lineWithPoints') {
					inputOwner.value = owner.name + ': Doğru(' + formatPointPair(owner.A) + ',' + formatPointPair(owner.B) + ')'
				} else if (owner.type === 'lineSegment') {
					inputOwner.value = owner.name + ': DoğruParçası(' + formatPointPair(owner.A) + ',' + formatPointPair(owner.B) + ')'
				} else if (owner.type === 'distanceSegment') {
					inputOwner.value = owner.name + ': Uzaklık(' + formatPointPair(owner.A) + ',' + formatPointPair(owner.B) + ')'
				} else if (owner.type === 'circleR') {
					inputOwner.value = formatCircleInput(owner)
				} else if (owner.type === 'circle2') {
					inputOwner.value = formatCircleInput(owner)
				} else if (owner.type === 'circle3') {
					inputOwner.value = formatCircleInput(owner)
				} else if (owner.type === 'angle') {
					inputOwner.value = owner.name + ': Açı(' + owner.A.name + ',' + owner.B.name + ',' + owner.C.name + ')'
					document.getElementById(owner.id + '-output').value = owner.name + '=' + formatAngleValue(getAngleMeasure(owner)) + '°'
				} else if (owner.type === 'arcMeasure') {
					let arcInfo = getPositiveArcMeasure(owner.A, owner.B, owner.circle)
					inputOwner.value = owner.name + ': YayÖlçüsü(' + owner.A.name + ',' + owner.B.name + ')'
					document.getElementById(owner.id + '-output').value = owner.name + '=' + (arcInfo ? formatAngleValue(arcInfo.span) + '\u00b0' : '?')
				}
			});
			reprojectAllOnOther()
			updateReflectPointRows()
			updateIntersectionPointRows()
		} else if (item.type == 'tangent') {
			input.value = 'Teğet(' + item.func + ',' + sliderA.value + ')'
			item.approachVal = Number(sliderA.value)
			output.value = item.name + ': y = ' + item.tngLine.func
			labelA.innerHTML = 'x = ' + sliderA.value
		} else if (item.type == 'tangentHX') {
			item.approachVal = Number(sliderA.value)
			item.h = Number(sliderB.value)

			let A = new mPoint(item.approachVal, math.evaluate(item.func, { x: item.approachVal }), true)
			let B = item.haveH ? new mPoint(item.approachVal + item.h, math.evaluate(item.func, { x: item.approachVal + item.h }), true) : new mPoint(item.h, math.evaluate(item.func, { x: item.h }), true)
			item.aodLine = new mLineWithPoints(A, B, true)

			let m = math.evaluate(derivative(item.func), { x: item.approachVal })
			let c = math.evaluate(item.func, { x: item.approachVal }) - m * item.approachVal
			item.tngLine = new mLineWithEquation(m, c, true)

			labelA.innerHTML = 'x₀ = ' + item.approachVal
			item.haveH ? labelB.innerHTML = 'h = ' + item.h : labelB.innerHTML = 'x = ' + item.h

			let tan, eq
			if (item.aodLine.A.a == item.aodLine.B.a && item.aodLine.A.b == item.aodLine.B.b) {
				eq = item.name + "'(" + item.approachVal + ")="
				tan = formatDisplayNumber(item.tngLine.m)
			} else {
				eq = ''
				tan = formatDisplayNumber(createLineEquation(item.aodLine.A, item.aodLine.B).m)
			}

			let N = item.haveH ? 'H' : 'X'
			input.value = 'Teğet' + N + '(' + item.func + ',' + item.approachVal + ')'
			if (item.haveH) output.value = '[' + item.name + '(' + item.approachVal + '+h) - ' + item.name + '(' + item.approachVal + ')] / h = ' + eq + tan
			if (!item.haveH) output.value = '[' + item.name + '(' + formatDisplayNumber(item.h) + ') - ' + item.name + '(x₀)] /(' + formatDisplayNumber(item.h) + '-x₀)  = ' + eq + tan
		} else if (item.type == 'arcMeasure') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			let arcInfo = getPositiveArcMeasure(item.A, item.B, item.circle)
			input.value = item.name + ': YayÖlçüsü(' + item.A.name + ',' + item.B.name + ')'
			output.value = item.name + '=' + (arcInfo ? formatAngleValue(arcInfo.span) + '\u00b0' : '?')
		} else if (item.type == 'lineWithEquation') {
			item.m = Number(sliderA.value)
			item.n = Number(sliderB.value)
			labelA.innerHTML = 'm = ' + item.m
			labelB.innerHTML = 'n = ' + item.n
			input.value = 'y = ' + normalizeLine(Number(item.m), Number(item.n))
		} else if (item.type == 'verLine') {
			item.x = Number(sliderA.value)
			labelA.innerHTML = 'x = ' + item.x
			input.value = item.name + ': x = ' + item.x
		} else if (item.type == 'circleR') {
			item.r = Number(sliderA.value)
			labelA.innerHTML = 'r = ' + item.r
			formatCircleInput(item)
		} else if (item.type == 'limit') {
			item.approachValRight = Number(sliderA.value)
			labelA.innerHTML = sliderA.min + '⁺ = ' + sliderA.value
			sliderA.innerHTML = item.approachValRight + '⁺ = ' + formatDisplayNumber(sliderA.value)
			item.approachValLeft = Number(sliderB.value)
			labelB.innerHTML = sliderB.max + '⁻ = ' + sliderB.value
			sliderB.innerHTML = item.approachVal + '⁻ = ' + formatDisplayNumber(sliderB.value)

			let A = new mPoint(Number(sliderA.value), 0)
			let B = new mPoint(Number(sliderA.value), math.evaluate(item.func, { x: A.a }))
			let C = new mPoint(0, math.evaluate(item.func, { x: A.a }))
			let vls = new mLineSegment(A, B)
			let hls = new mLineSegment(B, C)
			A.color = B.color = C.color = vls.color = hls.color = item.color
			vls.lineDash = hls.lineDash = [2, 5]
			drawLineSegment(vls)
			drawLineSegment(hls)
			drawPoint(A)
			drawPoint(B)
			drawPoint(C)
		} else {
			console.log('crossSlider: Type bulunamadı.')
		}
	}
	reprojectAllOnOther()
	updateReflectPointRows()
	updateIntersectionPointRows()
	drawAll()
}

function changeName(newName) {
	let hasNameid
	let found = arrObjects.find(item => item.name === newName)
	hasNameid = found ? found.id : null

	if (hasNameid != null && arrObjects[hasNameid] != newName) {
		let i = 1
		let names
		if (arrObjects[hasNameid].type === 'point') names = arrObjects.filter(item => item.type === "point").map(item => item.name)
		if (arrObjects[hasNameid].type === 'sequence') names = arrObjects.filter(item => item.type === "sequence").map(item => item.name)
		if (arrObjects[hasNameid].type === 'limit') names = arrObjects.filter(item => item.type === "limit").map(item => item.name)
		if (arrObjects[hasNameid].type === 'other' || arrObjects[hasNameid].type === 'line') names = arrObjects.filter(item => item.type === "line" || item.type === "other").map(item => item.name)
		let foundName
		while (true) {
			if (!(names).includes(arrObjects[hasNameid].name + i)) {
				foundName = arrObjects[hasNameid].name + i
				break
			}
			i++
		}
		arrObjects[hasNameid].name = foundName
	}
	arrObjects[activeElementID].name = newName
}

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const objectsContainer = document.getElementById('objectsContainer')
canvas.width = innerWidth
canvas.height = innerHeight

const clearSound = new Audio("sound/clear.mp3")
let activeObject = 'select'
let activeElementID = null
let lineDrawing = false
let lineA, lineB
let lineSegmentDrawing = false
let distanceSegmentDrawing = false
let reflectPointDrawing = false
let intersectDrawing = false
let circleDrawing = false
let angleDrawing = false
let arcMeasureDrawing = false
let lineSegmentA, lineSegmentB
let distanceSegmentA, distanceSegmentB
let reflectPointA, reflectPointB
let intersectLineA, intersectLineB
let reflectPointCreatedA = false
let circleA, circleB, circleC
let angleA, angleB, angleC
let arcMeasureA, arcMeasureB, arcMeasureCircle
let arcMeasureCreatedA = false
let circleTangentCircle = null
let scaleX = 100
let scaleY = 100
let minX = -5
let minY = -5

let horizontalUnits = [1 / 10, 1 / 5, 1 / 2, 1, 2, Math.E, Math.PI, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
let verticalUnits = [1 / 10, 1 / 5, 1 / 2, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
let tickX = 3
let unitX = verticalUnits[tickX]
let tickY = 3
let unitY = horizontalUnits[tickY]

let standartView = {
	scaleX,
	scaleY,
	minX,
	minY,
	tickX,
	tickY
}

let firstMousePos, lastMousePos, findPointPos = null
let arrObjects = []
let undoStack = []
let redoStack = []
let lastHistoryKey = null
let transientObjectIds = []
let sliderHistoryStartKey = null
let bigNames = "ABCDEFGO"
let smallNames = "abccdefg"
let lineNames = "fghpqr"
let angleNames = "\u03b1\u03b2\u03b8"
let sliders = document.getElementById('sliders')

let grabbing = false
let hitObject = null
let panStartMouse = null
let panStartMinX = 0
let panStartMinY = 0
let axisUnitDrag = null
const axisDragThreshold = 8
const axisDragStep = 35

let idCount = -1
function idCounter() {
	idCount++
	return idCount
}

function cloneHistoryState(state = arrObjects) {
	return structuredClone(state)
}

function resetTransientDrawingState() {
	lineDrawing = false
	lineSegmentDrawing = false
	distanceSegmentDrawing = false
	reflectPointDrawing = false
	intersectDrawing = false
	circleDrawing = false
	angleDrawing = false
	arcMeasureDrawing = false
	lineA = lineB = null
	lineSegmentA = lineSegmentB = null
	distanceSegmentA = distanceSegmentB = null
	reflectPointA = reflectPointB = null
	intersectLineA = intersectLineB = null
	reflectPointCreatedA = false
	circleA = circleB = circleC = null
	angleA = angleB = angleC = null
	arcMeasureA = arcMeasureB = arcMeasureCircle = null
	arcMeasureCreatedA = false
	circleTangentCircle = null
}

function trackTransientObject(obj) {
	if (!obj || obj.id == null) return
	if (!transientObjectIds.includes(obj.id)) transientObjectIds.push(obj.id)
}

function clearTransientObjectIds() {
	transientObjectIds = []
}

function removeTransientObjects() {
	if (transientObjectIds.length == 0) return false
	arrObjects = arrObjects.filter(item => !transientObjectIds.includes(item.id))
	clearTransientObjectIds()
	return true
}

function commitDrawingHistoryState() {
	clearTransientObjectIds()
	commitHistoryState()
}

function beginSliderHistory() {
	if (sliderHistoryStartKey != null) return
	sliderHistoryStartKey = JSON.stringify(arrObjects)
}

function commitSliderHistory() {
	if (sliderHistoryStartKey == null) return
	let sliderHistoryEndKey = JSON.stringify(arrObjects)
	if (sliderHistoryStartKey !== sliderHistoryEndKey) {
		commitHistoryState()
	}
	sliderHistoryStartKey = null
}

function cancelActiveToolAndReturnSelect() {
	removeTransientObjects()
	resetTransientDrawingState()
	grabbing = false
	hitObject = null
	firstMousePos = lastMousePos = panStartMouse = axisUnitDrag = null
	activeElementID = null
	activeObject = 'select'

	if (window.drAW2DRadialToolbar?.selectToolByAction) {
		window.drAW2DRadialToolbar.selectToolByAction('select', {
			showToast: false
		})
	}

	drawAll()
	labelsCreator()
}

function commitHistoryState() {
	let historyKey = JSON.stringify(arrObjects)
	if (historyKey === lastHistoryKey) return
	undoStack.push(cloneHistoryState())
	lastHistoryKey = historyKey
	redoStack = []
	updateHistoryControlsState()
}

function restoreHistoryState(state) {
	arrObjects = cloneHistoryState(state)
	lastHistoryKey = JSON.stringify(arrObjects)
	activeElementID = null
	activeObject = 'select'
	resetTransientDrawingState()
	drawAll()
	labelsCreator()
	updateHistoryControlsState()
}

function undoHistoryState() {
	if (undoStack.length <= 1) return
	redoStack.push(undoStack.pop())
	restoreHistoryState(undoStack[undoStack.length - 1])
}

function redoHistoryState() {
	if (redoStack.length == 0) return
	let nextState = redoStack.pop()
	undoStack.push(cloneHistoryState(nextState))
	restoreHistoryState(nextState)
}

function updateHistoryControlsState() {
	let undoButton = document.getElementById('undo')
	let redoButton = document.getElementById('redo')
	let clearButton = document.getElementById('clear')
	if (!undoButton || !redoButton || !clearButton) return

	undoButton.disabled = undoStack.length <= 1
	redoButton.disabled = redoStack.length == 0
	clearButton.disabled = arrObjects.length == 0
}

function getCanvasPixelPos(evt) {
	let rect = canvas.getBoundingClientRect()
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top,
	}
}

function getAxisDragTarget(evt) {
	let pixelPos = getCanvasPixelPos(evt)
	let xAxisY = -minY * scaleX
	let yAxisX = -minX * scaleY
	let nearXAxis = xAxisY >= 0 && xAxisY <= canvas.height && Math.abs(pixelPos.y - xAxisY) <= axisDragThreshold
	let nearYAxis = yAxisX >= 0 && yAxisX <= canvas.width && Math.abs(pixelPos.x - yAxisX) <= axisDragThreshold

	if (nearXAxis && nearYAxis) {
		return Math.abs(pixelPos.y - xAxisY) <= Math.abs(pixelPos.x - yAxisX) ? 'xAxis' : 'yAxis'
	}
	if (nearXAxis) return 'xAxis'
	if (nearYAxis) return 'yAxis'
	return null
}

function updateAxisUnitDrag(evt) {
	if (!axisUnitDrag) return false

	if (axisUnitDrag.axis == 'xAxis') {
		let delta = Math.trunc((evt.clientX - axisUnitDrag.startX) / axisDragStep)
		let nextTick = Math.max(0, Math.min(horizontalUnits.length - 1, axisUnitDrag.startTick + delta))
		let appliedDelta = nextTick - axisUnitDrag.startTick
		tickY = nextTick
		unitY = horizontalUnits[tickY]
		scaleY = axisUnitDrag.startScale * (appliedDelta >= 0 ? Math.pow(.95, appliedDelta) : Math.pow(1.05, -appliedDelta))
		return true
	}

	let delta = Math.trunc((axisUnitDrag.startY - evt.clientY) / axisDragStep)
	let nextTick = Math.max(0, Math.min(verticalUnits.length - 1, axisUnitDrag.startTick + delta))
	let appliedDelta = nextTick - axisUnitDrag.startTick
	tickX = nextTick
	unitX = verticalUnits[tickX]
	scaleX = axisUnitDrag.startScale * (appliedDelta >= 0 ? Math.pow(.95, appliedDelta) : Math.pow(1.05, -appliedDelta))
	return true
}

function reprojectAllOnOther() {
	arrObjects.forEach(obj => {
		if (obj.type == 'point') {
			if (obj.onOther.length > 0) {
				obj.onOther.forEach(o => {
					if (o.type == 'onCircle') {
						let circle = arrObjects.find(item => item.id == o.circleId)
						if (circle.type == 'circle2') {
							let r = distanceAB(circle.A, circle.B)
							let angle = Math.atan2(obj.b - circle.A.b, obj.a - circle.A.a)
							obj.a = circle.A.a + r * Math.cos(angle)
							obj.b = circle.A.b + r * Math.sin(angle)
						} else if (circle.type == 'circle3') {
							let r = getCircle3RA(circle).r
							let angle = Math.atan2(obj.b - getCircle3RA(circle).n, obj.a - getCircle3RA(circle).m)
							obj.a = getCircle3RA(circle).m + r * Math.cos(angle)
							obj.b = getCircle3RA(circle).n + r * Math.sin(angle)
						} else if (circle.type == 'circleR') {
							let r = circle.r
							let angle = Math.atan2(obj.b - circle.A.b, obj.a - circle.A.a)
							obj.a = circle.A.a + r * Math.cos(angle)
							obj.b = circle.A.b + r * Math.sin(angle)
						} else {
							console.log('reProjectAllOnOther: Type bulunamadı.')
						}
					} else if (o.type == 'onLine') {
						let line = arrObjects.find(item => item.id == o.lineId)
						let projection = getProjectionOnLine(line, obj.a, obj.b)
						if (projection.status) {
							obj.a = projection.a
							obj.b = projection.b
						}
					} else if (o.type == 'onCircleTangent') {
						let tangent = arrObjects.find(item => item.id == o.tangentId)
						let projection = getProjectionOnCircleTangent(tangent, obj.a, obj.b, o.lineIndex)
						if (projection.status) {
							obj.a = projection.a
							obj.b = projection.b
						}
					} else if (o.type == 'onAngle') {
						let angle = arrObjects.find(item => item.id == o.angleId)
						let projection = getProjectionOnAngle(angle, obj.a, obj.b)
						if (projection.status) {
							obj.a = projection.a
							obj.b = projection.b
						}
					} else if (o.type == 'reflectPoint') {
						let source = arrObjects.find(item => item.id == o.sourceId)
						let center = arrObjects.find(item => item.id == o.centerId)
						if (source && center) {
							let reflected = getReflectedPoint(source, center)
							obj.a = reflected.a
							obj.b = reflected.b
						}
					} else if (o.type == 'intersectLines') {
						let line1 = arrObjects.find(item => item.id == o.line1Id)
						let line2 = arrObjects.find(item => item.id == o.line2Id)
						let intersection = getObjectIntersection(line1, line2)
						let point = intersection.points[o.pointIndex || 0]
						if (point) {
							obj.a = point.a
							obj.b = point.b
						} else {
							obj.a = NaN
							obj.b = NaN
						}
						obj.intersectionStatus = intersection.reason
						if (obj.intersectionOwner) {
							obj.intersectionPointIds = arrObjects
								.filter(item => getIntersectionPointConstraint(item)?.ownerId == obj.id || item.id == obj.id)
								.map(item => item.id)
						}
					} else if (o.type == 'circleTangentTouchPoint') {
						let tangent = arrObjects.find(item => item.id == o.tangentId)
						let touchPoint = getCircleTangentTouchPoint(tangent, o.pointIndex || 0)
						if (touchPoint) {
							obj.a = touchPoint.a
							obj.b = touchPoint.b
						} else {
							obj.a = NaN
							obj.b = NaN
						}
					}
				})
			}
		}
	});
}

function derivative(funcStr, variable = "x") {
	try {
		const df = math.derivative(funcStr, variable);
		return df.toString().replaceAll(' ', '');
	} catch (err) {
		return "undefined";
	}
}

function getRandomColor() {
	var lum = -0.25
	var hex = String('#' + Math.random().toString(16).slice(2, 8).toUpperCase()).replace(/[^0-9a-f]/gi, '')
	if (hex.length < 6) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
	}
	var rgbColor = "#",
		c, i
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i * 2, 2), 16)
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16)
		rgbColor += ("00" + c).substr(c.length)
	}
	return rgbColor
}

function createName(type) {
	let nm
	let iFound = false
	let i = 0
	let objNames = arrObjects.map((item) => item.name)
	let newNames
	if (type == 'point') {
		newNames = bigNames
	} else if (type == 'lineSegment' || type == 'distanceSegment' || type == 'sequence' || type == 'circleR' || type == 'arcMeasure') {
		newNames = smallNames
	} else if (type == 'line' || type == 'limit' || type == 'tangent' || type == 'function' || type == 'sectionalFunctions' || type == 'tangent' || type == 'tangentHX' || type == 'derivative' || type == 'functioncomposition') {
		newNames = lineNames
	} else if (type == 'angle') {
		newNames = angleNames
	}

	if (arrObjects.length == 0) return newNames[0]
	while (!iFound) {
		if (i < newNames.length) {
			if (!objNames.includes(newNames[i])) {
				iFound = true
				nm = newNames[i]
			}
		}
		if (i >= newNames.length) {
			if (!(objNames.includes(newNames[i % newNames.length] + ((i / newNames.length) - ((i / newNames.length) % 1))))) {
				iFound = true
				nm = newNames[i % newNames.length] + ((i / newNames.length) - ((i / newNames.length) % 1))
			}
		}
		i++
	}
	return nm
}

function activateToolFromAction(action) {
	if (!action) return
	if (action !== activeObject) {
		let removedTransientObjects = removeTransientObjects()
		resetTransientDrawingState()
		activeElementID = null
		if (removedTransientObjects) labelsCreator()
	}

	switch (action) {
		case 'select':
			activeObject = 'select'
			break

		case 'point':
			activeObject = 'point'
			break

		case 'line':
			activeObject = 'line'
			break

		case 'linesegment':
			activeObject = 'linesegment'
			break

		case 'distancesegment':
			activeObject = 'distancesegment'
			break

		case 'reflectpoint':
			activeObject = 'reflectpoint'
			reflectPointDrawing = false
			reflectPointA = reflectPointB = null
			reflectPointCreatedA = false
			break

		case 'intersect':
			activeObject = 'intersect'
			intersectDrawing = false
			intersectLineA = intersectLineB = null
			break

		case 'circle2':
			activeObject = 'circle2'
			break

		case 'circle3':
			activeObject = 'circle3'
			break

		case 'angle':
			activeObject = 'angle'
			break

		case 'arcmeasure':
			activeObject = 'arcmeasure'
			arcMeasureDrawing = false
			arcMeasureA = arcMeasureB = arcMeasureCircle = null
			arcMeasureCreatedA = false
			break

		case 'circletangent':
			activeObject = 'circletangent'
			circleTangentCircle = null
			break

		case 'help':
			initializeHelpMenu()
			document.getElementById('help-popup').style.display = 'flex'
			document.getElementById('giris').value = ''
			document.getElementById('helpSearch')?.focus()
			break

		default:
			console.warn('Bilinmeyen araç:', action)
			return
	}

	drawAll()
}



function shouldReturnSelectAfterTool(action) {
	return action !== 'select' && action !== 'point'
}

function finishToolAndReturnSelect() {
	if (!shouldReturnSelectAfterTool(activeObject)) return

	if (window.drAW2DRadialToolbar?.selectToolByAction) {
		window.drAW2DRadialToolbar.selectToolByAction('select', {
			showToast: false
		})
		return
	}

	activateToolFromAction('select')
}

let toastTimer = null

function updateToastLayout() {
	// Toast layout is handled by CSS media queries.
}

function showToast(titleOrToast, msg = '') {
	if (!titleOrToast && !msg) return

	let title = titleOrToast || ''
	let message = msg || ''

	if (!message && typeof titleOrToast === 'string' && titleOrToast.includes('|')) {
		const parts = titleOrToast.split('|')
		title = parts[0] || ''
		message = parts.slice(1).join('|') || ''
	}

	const x = document.getElementById('snackbar')
	const snackTitle = document.getElementById('snackTitle')
	const snackContent = document.getElementById('snackContent')

	if (!x || !snackTitle || !snackContent) return

	snackTitle.textContent = title.toLocaleUpperCase('tr-TR')
	snackContent.textContent = message

	updateToastLayout()
	x.classList.add('show', 'is-visible')

	clearTimeout(toastTimer)

	toastTimer = setTimeout(function () {
		x.classList.remove('show', 'is-visible')
	}, 2800)
}

window.addEventListener('resize', updateToastLayout)
window.addEventListener('orientationchange', updateToastLayout)




function connectRadialToolbar() {
	const radialToolbar = document.getElementById('radialToolbar')

	if (!radialToolbar) {
		console.warn('radialToolbar bulunamadı.')
		return
	}

	radialToolbar.addEventListener('radial-tool-change', event => {
		const { action, toast, title, showToast: shouldShowToast = true } = event.detail

		activateToolFromAction(action)

		if (!shouldShowToast) return

		if (toast) {
			showToast(toast)
		} else if (title) {
			showToast(title)
		}
	})

	const initialTool = window.drAW2DRadialToolbar?.getActiveTool?.()

	if (initialTool?.action) {
		activateToolFromAction(initialTool.action)
	}
}


document.getElementById('btnCalc').addEventListener('click', function () {
	activeObject = 'select'

	toggleCalcIcon(document.getElementById('btnimgCalc'))

	document.getElementById('rightWrapper').classList.toggle('hide')

	updateToolWrapperRight()
	drawAll()
})

function setRightToolbarOpen(isOpen) {
	const rightToolbar = document.getElementById('rightToolbar')
	const btnAcordeon = document.getElementById('btnAcordeon')
	if (!rightToolbar || !btnAcordeon) return

	rightToolbar.classList.toggle('is-open', isOpen)
	btnAcordeon.setAttribute('aria-expanded', String(isOpen))
	btnAcordeon.title = isOpen ? 'Araçları gizle' : 'Araçları göster'
}

document.getElementById('btnAcordeon')?.addEventListener('click', function () {
	const rightToolbar = document.getElementById('rightToolbar')
	if (!rightToolbar) return

	setRightToolbarOpen(!rightToolbar.classList.contains('is-open'))
})

document.getElementById('btnStandartWiew').addEventListener('click', function () {
	activeObject = 'select'
	cancelActiveToolAndReturnSelect()
	resetStandartView()
})

function handleCircleTangentMouseDown(evt) {
	if (!circleTangentCircle) {
		if (hitObject.hitType == 'circleR' || hitObject.hitType == 'circle2' || hitObject.hitType == 'circle3') {
			circleTangentCircle = hitObject.hit
			activeElementID = circleTangentCircle.id
			showToast('Teğet', 'Şimdi teğet çizilecek noktayı seçiniz.')
		} else {
			showToast('Teğet', 'Önce teğet çizilecek çemberi seçiniz.')
		}
		return
	}

	if (hitObject.hitType == 'point' || !hitObject.hit) {
		let circleTangentPoint
		if (hitObject.hitType == 'point') {
			circleTangentPoint = hitObject.hit
		} else {
			circleTangentPoint = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
			arrObjects.push(circleTangentPoint)
			trackTransientObject(circleTangentPoint)
			labelsCreator()
			drawAll()
		}

		let tangentData = getCircleTangentLines(circleTangentPoint, circleTangentCircle)
		if (tangentData.status) {
			let tangent = addCircleTangentWithTouchPoints(circleTangentPoint, circleTangentCircle)
			activeElementID = tangent.id
			commitDrawingHistoryState()
			circleTangentCircle = null

			finishToolAndReturnSelect()

			labelsCreator()
			drawAll()
		} else if (tangentData.reason == 'inside') {
			showToast('Teğet', 'Seçilen nokta çemberin içinde olduğu için teğet çizilemez.')
		} else {
			showToast('Teğet', 'Bu çember için teğet çizilemedi.')
		}
	} else {
		showToast('Teğet', 'Teğet çizilecek noktayı seçiniz.')
	}
}

function handleArcMeasureMouseDown(evt) {
	let mousePos = getMousePos(evt)
	let selected = getArcMeasurePointFromHit(hitObject, mousePos, arcMeasureCircle)

	if (!selected.status) {
		let message = selected.reason == 'differentCircle'
			? 'Aynı çember üzerinde bir nokta seçin.'
			: 'Çember üzerinde bir nokta seçin.'
		showToast('Yay Ölçüsü', message)
		return
	}

	if (!arcMeasureDrawing) {
		arcMeasureA = selected.point
		arcMeasureCircle = selected.circle
		if (selected.created) {
			arrObjects.push(arcMeasureA)
			trackTransientObject(arcMeasureA)
		}
		arcMeasureCreatedA = selected.created
		arcMeasureDrawing = true
		activeElementID = arcMeasureA.id
		showToast('Yay Ölçüsü', 'Aynı çember üzerinde ikinci noktayı seçin.')
		labelsCreator()
		drawAll()
		return
	}

	arcMeasureB = selected.point
	if (arcMeasureA.id == arcMeasureB.id) {
		showToast('Yay Ölçüsü', 'Farklı bir nokta seçin.')
		return
	}
	if (selected.created) {
		arrObjects.push(arcMeasureB)
		trackTransientObject(arcMeasureB)
	}

	let arcMeasure = new mArcMeasure(arcMeasureA, arcMeasureB, arcMeasureCircle)
	arrObjects.push(arcMeasure)
	activeElementID = arcMeasure.id
	commitDrawingHistoryState()
	arcMeasureDrawing = false
	arcMeasureA = arcMeasureB = arcMeasureCircle = null
	arcMeasureCreatedA = false

	finishToolAndReturnSelect()

	labelsCreator()
	drawAll()
}

document.querySelectorAll('.example').forEach(el => {
	el.addEventListener('click', () => {
		const giris = document.getElementById('giris')
		const rightWrapper = document.getElementById('rightWrapper')
		const btnimgCalc = document.getElementById('btnimgCalc')

		if (rightWrapper && rightWrapper.classList.contains('hide')) {
			rightWrapper.classList.remove('hide')
			btnimgCalc?.classList.remove('panel-hidden')
			updateToolWrapperRight()
			drawAll()
		}

		if (giris) {
			giris.value = el.textContent.trim()
			giris.focus()
			closeHelp()
		}
	})
})

function girisKeyDown(event) {
	handleParanthesis(event)
	let allowKeys = '(){}[],=-+.;<>*^/_abcçdefgğhıijklmnoöpqrsştuüvwxyzCÇEFGĞHIİJKMNOÖPQRSŞTUÜVWXYZBackspaceArrowLeftArrowRightShiftDelete'
	if (isNaN(event.key) && !allowKeys.includes(event.key)) {
		event.preventDefault()
	}
	if (event.key === 'Enter' && event.target.value != '') {
		let str = event.target.value
		if (isPoint(str).status) {
			let pt = new mPoint(isPoint(str).a, isPoint(str).b)
			arrObjects.push(pt)
			activeElementID = pt.id
			commitHistoryState()
		} else if (isCircleR(str).status) {
			let m = new mPoint(isCircleR(str).a, isCircleR(str).b)
			arrObjects.push(m)
			let c = new mCircleR(m, isCircleR(str).r)
			arrObjects.push(c)
			activeElementID = c.id
			commitHistoryState()
		} else if (isCircle2(str).status) {
			let A = new mPoint(isCircle2(str).m, isCircle2(str).n)
			arrObjects.push(A)
			let B = new mPoint(isCircle2(str).a, isCircle2(str).b)
			arrObjects.push(B)
			let c = new mCircle2(A, B)
			arrObjects.push(c)
			activeElementID = c.id
			commitHistoryState()
		} else if (isCircle3(str).status) {
			let A = new mPoint(isCircle3(str).ax, isCircle3(str).ay)
			arrObjects.push(A)
			let B = new mPoint(isCircle3(str).bx, isCircle3(str).by)
			arrObjects.push(B)
			let C = new mPoint(isCircle3(str).cx, isCircle3(str).cy)
			arrObjects.push(C)
			let c = new mCircle3(A, B, C)
			arrObjects.push(c)
			activeElementID = c.id
			commitHistoryState()
		} else if (isVerLine(str).status) {
			let vl = new mVerLine(isVerLine(str).x)
			arrObjects.push(vl)
			activeElementID = vl.id
			commitHistoryState()
		} else if (isLineWithEquation(str).status) {
			let l = new mLineWithEquation(isLineWithEquation(str).m, isLineWithEquation(str).n)
			arrObjects.push(l)
			activeElementID = l.id
			commitHistoryState()
		} else if (isLineWithPoints(str).status) {
			let A = new mPoint(isLineWithPoints(str).xA, isLineWithPoints(str).yA)
			arrObjects.push(A)
			let B = new mPoint(isLineWithPoints(str).xB, isLineWithPoints(str).yB)
			arrObjects.push(B)
			let line = new mLineWithPoints(A, B)
			arrObjects.push(line)
			activeElementID = line.id
			commitHistoryState()
		} else if (isLineSegment(str).status) {
			let A = new mPoint(isLineSegment(str).xA, isLineSegment(str).yA)
			arrObjects.push(A)
			let B = new mPoint(isLineSegment(str).xB, isLineSegment(str).yB)
			arrObjects.push(B)
			let lineSegment = new mLineSegment(A, B)
			arrObjects.push(lineSegment)
			activeElementID = lineSegment.id
			commitHistoryState()
		} else if (isDistanceSegment(str).status) {
			let A = new mPoint(isDistanceSegment(str).xA, isDistanceSegment(str).yA)
			arrObjects.push(A)
			let B = new mPoint(isDistanceSegment(str).xB, isDistanceSegment(str).yB)
			arrObjects.push(B)
			let distanceSegment = new mDistanceSegment(A, B)
			arrObjects.push(distanceSegment)
			activeElementID = distanceSegment.id
			commitHistoryState()
		} else if (isArcMeasureInput(str).status) {
			let arcMeasureInput = isArcMeasureInput(str)
			let A = resolvePointByName(arcMeasureInput.pointAName)
			let B = resolvePointByName(arcMeasureInput.pointBName)

			if (!A || !B || A.id == B.id) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. İki farklı nokta bulunmalı.')
			} else {
				let circle = getCommonCircleForPoints(A, B)
				if (!circle) {
					showToast('GİRİŞ', 'Hatalı giriş yaptınız. Noktalar aynı çember üzerinde olmalı.')
				} else {
					let arcMeasure = new mArcMeasure(A, B, circle)
					arrObjects.push(arcMeasure)
					activeElementID = arcMeasure.id
					commitHistoryState()
				}
			}
		} else if (isReflectPointInput(str).status) {
			let reflectInput = isReflectPointInput(str)
			let sourceResult = resolvePointArgument(reflectInput.sourceArg)
			let centerResult = resolvePointArgument(reflectInput.centerArg)

			if (!sourceResult.status || !centerResult.status) {
				if (sourceResult.created) arrObjects = arrObjects.filter(item => item.id !== sourceResult.point.id)
				if (centerResult.created) arrObjects = arrObjects.filter(item => item.id !== centerResult.point.id)
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Nokta bulunamadı veya oluşturulamadı.')
			} else {
				let reflectedPoint = createReflectedPoint(sourceResult.point, centerResult.point)
				arrObjects.push(reflectedPoint)
				activeElementID = reflectedPoint.id
				commitHistoryState()
			}
		} else if (isIntersectInput(str).status) {
			let intersectInput = isIntersectInput(str)
			let line1 = resolveLineByName(intersectInput.line1Name)
			let line2 = resolveLineByName(intersectInput.line2Name)

			if (!line1 || !line2 || line1.id == line2.id) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. İki farklı nesne bulunmalı.')
			} else {
				let points = createIntersectionPoints(line1, line2)
				points.forEach(point => arrObjects.push(point))
				activeElementID = points[0].id
				commitHistoryState()
			}
		} else if (isAngle(str).status) {
			let A = new mPoint(isAngle(str).ax, isAngle(str).ay)
			arrObjects.push(A)
			let B = new mPoint(isAngle(str).bx, isAngle(str).by)
			arrObjects.push(B)
			let C = new mPoint(isAngle(str).cx, isAngle(str).cy)
			arrObjects.push(C)
			let angle = new mAngle(A, B, C)
			arrObjects.push(angle)
			activeElementID = angle.id
			commitHistoryState()
		} else if (isSequence(str).status) {
			let seq = new mSequence(isSequence(str).func, isSequence(str).start, isSequence(str).end)
			arrObjects.push(seq)
			activeElementID = seq.id
			commitHistoryState()
		} else if (isCircleTangentInput(str).status) {
			let circleTangentInput = isCircleTangentInput(str)
			let circle = resolveCircleByName(circleTangentInput.circleName)

			if (!circle) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Çember bulunamadı.')
			} else {
				let pointResult = resolveCircleTangentPoint(circleTangentInput.pointArg)
				if (!pointResult.status) {
					showToast('GİRİŞ', 'Hatalı giriş yaptınız. Nokta bulunamadı veya oluşturulamadı.')
					return
				}

				let tangentData = getCircleTangentLines(pointResult.point, circle)
				if (tangentData.status) {
					let tangent = addCircleTangentWithTouchPoints(pointResult.point, circle)
					activeElementID = tangent.id
					commitHistoryState()
				} else if (tangentData.reason == 'inside') {
					showToast('TeğetC', 'Seçilen nokta çemberin içinde olduğu için teğet çizilemez.')
				} else {
					showToast('TeğetC', 'Bu çember için teğet çizilemedi.')
				}
			}
		} else if (isLimit(str).status) {
			let funcFound = true
			let names = arrObjects.map((item) => item.name)

			if (!isLimit(str).func.includes('x') && !Number.isFinite(Number(isLimit(str).func))) {
				if (!names.includes(isLimit(str).func)) funcFound = false
			}
			if (funcFound) {
				if (!isLimit(str).func.includes('x') && !Number.isFinite(Number(isLimit(str).func))) {
					str = str.replaceAll(isLimit(str).func, arrObjects.find(o => o.name === isLimit(str).func).func)
				}
				let lim = new mLimit(isLimit(str).func, isLimit(str).approachVal)
				arrObjects.push(lim)
				activeElementID = lim.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}
		} else if (isTangent(str).status) {
			let funcFound = true
			let names = arrObjects.map((item) => item.name)
			if (!isTangent(str).func.includes('x') && !Number.isFinite(Number(isTangent(str).func))) {
				if (!names.includes(isTangent(str).func)) funcFound = false
			}
			if (funcFound) {
				if (!isTangent(str).func.includes('x') && !Number.isFinite(Number(isTangent(str).func))) {
					str = str.replaceAll(isTangent(str).func, arrObjects.find(o => o.name === isTangent(str).func).func)
				}
				let tng = new mTangent(isTangent(str).func, isTangent(str).approachVal)
				arrObjects.push(tng)
				activeElementID = tng.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}

		} else if (isTangentHX(str).status) {
			let funcFound = true
			let names = arrObjects.map((item) => item.name)
			if (!isTangentHX(str).func.includes('x') && !Number.isFinite(Number(isTangentHX(str).func))) {
				if (!names.includes(isTangentHX(str).func)) funcFound = false
			}
			if (funcFound) {
				if (!isTangentHX(str).func.includes('x') && !Number.isFinite(Number(isTangentHX(str).func))) {
					str = str.replaceAll(isTangentHX(str).func, arrObjects.find(o => o.name === isTangentHX(str).func).func)
				}
				let tngHX = new mTangentHX(isTangentHX(str).func, isTangentHX(str).approachVal, isTangentHX(str).haveH)
				arrObjects.push(tngHX)
				activeElementID = tngHX.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}

		} else if (isDerivative(str).status) {
			let funcFound = true
			let names = arrObjects.map((item) => item.name)
			if (funcFound) {
				let func = new mFunction(isDerivative(str).func, true)
				let derFunc = new mFunction(derivative(func.func.func), true)
				let der = new mDerivative(func, derFunc)
				func.id = func.func.id = derFunc.id = der.id
				func.name = der.name
				derFunc.name = der.name + "'"
				arrObjects.push(der)
				activeElementID = der.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}

		} else if (isFunctionCompositions(str).status) {
			let funcsFound = true
			let names = arrObjects.map((item) => item.name)
			isFunctionCompositions(str).functions.forEach(f => {
				if (!f.includes('x') && !Number.isFinite(Number(f))) {
					if (!names.includes(f)) funcsFound = false
				}
			});
			if (funcsFound) {
				isFunctionCompositions(str).functions.forEach(f => {
					if (!f.includes('x') && !Number.isFinite(Number(f))) {
						str = str.replaceAll(f, arrObjects.find(o => o.name === f).func)
					}
				})

				let funcComps = new mFunctionComposions(isFunctionCompositions(str).functions)
				arrObjects.push(funcComps)
				activeElementID = funcComps.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}
		} else if (isFunctionOperations(str).status) {
			const hepsiVarMi = isFunctionOperations(str).functions.every(name => arrObjects.some(f => f.name === name));
			if (hepsiVarMi) {
				let comeWithFuncs = str
				isFunctionOperations(str).functions.forEach(f => {
					comeWithFuncs = comeWithFuncs.replaceAll(f, '(' + arrObjects.find(o => o.name === f).func + ')')
				});
				let fo = new mFunction(comeWithFuncs)
				arrObjects.push(fo)
				activeElementID = fo.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı.')
			}
		} else if (isFunction(str).status) {
			let f = new mFunction(isFunction(str).func)
			arrObjects.push(f)
			activeElementID = f.id
			commitHistoryState()
		} else if (isSectionalFunctions(str).status) {
			let allFuncsDrawable = true
			if (allFuncsDrawable) {
				let secFuncs = []
				isSectionalFunctions(str).functions.forEach((func, i) => {
					if (isLineWithEquation(func).status) {
						let line = new mLineWithEquation(isLineWithEquation(func).m, isLineWithEquation(func).n, false, isSectionalFunctions(str).ranges[i].from, isSectionalFunctions(str).ranges[i].to)
						secFuncs.push(line)
					} else if (isFunction(func).status) {
						let other = new mFunction(func, false, isSectionalFunctions(str).ranges[i].from, isSectionalFunctions(str).ranges[i].to)
						secFuncs.push(other)
					}
				})
				let sf = new mSectionalFunctions(str)
				sf.secFuncs = secFuncs
				arrObjects.push(sf)
				activeElementID = sf.id
				commitHistoryState()
			} else {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız.')
			}

		} else {
			showToast('Hata', 'Girdi tanınamadı. Lütfen doğru formatta girdiğinizden emin olun.')
		}
		drawAll()
		labelsCreator()
		event.target.value = null
	}
}

function createLineEquation(A, B) {
	let m = (B.b - A.b) / (B.a - A.a)
	let c = A.b - m * A.a
	return {
		m: m,
		c: c
	}
}

function isMouseNearLineWithPoints(mousePos, A, B, threshold = 0.1) {
	if (A.a == B.a) {
		return Math.abs(mousePos.x - A.a) < threshold
	}

	let lineEq = createLineEquation(A, B)
	let expectedY = lineEq.m * mousePos.x + lineEq.c
	return Math.abs(mousePos.y - expectedY) < threshold
}

function isMouseNearLineSegment(mousePos, A, B, threshold = 0.1) {
	let withinSegment =
		mousePos.x >= Math.min(A.a, B.a) - threshold &&
		mousePos.x <= Math.max(A.a, B.a) + threshold &&
		mousePos.y >= Math.min(A.b, B.b) - threshold &&
		mousePos.y <= Math.max(A.b, B.b) + threshold

	if (!withinSegment) return false
	if (A.a == B.a) return Math.abs(mousePos.x - A.a) < threshold

	let lineEq = createLineEquation(A, B)
	let expectedY = lineEq.m * mousePos.x + lineEq.c
	return Math.abs(mousePos.y - expectedY) < threshold
}

function isMobile() {
	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function hitPoint(mousePos, threshold) {
	for (const obj of arrObjects) {
		if (obj.type === 'point') {
			if (!Number.isFinite(Number(obj.a)) || !Number.isFinite(Number(obj.b))) continue
			const dx = mousePos.x - obj.a
			const dy = mousePos.y - obj.b
			const distance = Math.sqrt(dx * dx + dy * dy)

			if (distance < threshold) {
				return obj
			}
		}
	}
	return null
}

function hitLine(mousePos, obj, threshold) {
	if (obj.type === 'lineWithEquation') {
		let expectedY = math.evaluate(obj.func, { x: mousePos.x })
		return Math.abs(mousePos.y - expectedY) < threshold
	}
	if (obj.type === 'verLine') {
		return Math.abs(mousePos.x - obj.x) < threshold
	}
	if (obj.type === 'lineSegment' || obj.type === 'distanceSegment') {
		return isMouseNearLineSegment(mousePos, obj.A, obj.B, threshold)
	}
	if (obj.type === 'lineWithPoints') {
		return isMouseNearLineWithPoints(mousePos, obj.A, obj.B, threshold)
	}
	if (obj.type === 'circleTangent') {
		let tangentData = getCircleTangentLines(obj.A, obj.circle)
		return tangentData.status && tangentData.lines.some(line => isMouseNearLineWithPoints(mousePos, line.A, line.B, threshold))
	}
	if (obj.type === 'sequence') {
		let expectedY = math.evaluate(obj.func, { n: mousePos.x })
		return Math.abs(mousePos.y - expectedY) < threshold
	}
	return false
}

function hitCircle(mousePos, obj, threshold) {
	if (obj.type !== 'circleR' && obj.type !== 'circle2' && obj.type !== 'circle3') return false

	let r, distance
	if (obj.type === 'circleR') {
		r = obj.r
		distance = Math.sqrt((mousePos.x - obj.A.a) ** 2 + (mousePos.y - obj.A.b) ** 2)
	} else if (obj.type === 'circle2') {
		r = Math.sqrt((obj.B.a - obj.A.a) ** 2 + (obj.B.b - obj.A.b) ** 2)
		distance = Math.sqrt((mousePos.x - obj.A.a) ** 2 + (mousePos.y - obj.A.b) ** 2)
	} else if (obj.type === 'circle3') {
		let data = getCircle3RA(obj)
		r = data.r
		distance = Math.sqrt((mousePos.x - data.m) ** 2 + (mousePos.y - data.n) ** 2)
	}

	return Math.abs(distance - r) < threshold
}

function hitAngle(mousePos, obj, threshold) {
	return obj.type === 'angle' && (
		isMouseNearLineSegment(mousePos, obj.A, obj.B, threshold) ||
		isMouseNearLineSegment(mousePos, obj.B, obj.C, threshold)
	)
}

function getHitObject(mousePos) {
	const threshold = 0.1
	let point = hitPoint(mousePos, threshold)
	if (point) {
		canvas.style.cursor = 'pointer'
		return { hit: point, hitType: point.type }
	}

	for (const obj of arrObjects) {
		if (obj.type === 'point') continue
		if (hitLine(mousePos, obj, threshold) || hitCircle(mousePos, obj, threshold) || hitAngle(mousePos, obj, threshold)) {
			canvas.style.cursor = 'pointer'
			return { hit: obj, hitType: obj.type }
		}
	}

	canvas.style.cursor = 'default'
	return { hit: null, hitType: null }
}

function initializeLegacyApp() {

	// document.addEventListener('contextmenu', event => event.preventDefault())

	drawAll()
	window.onresize = function () {
		canvas.width = innerWidth
		canvas.height = innerHeight
		updateToolWrapperRight()
		drawAll()
	}

	if (isMobile()) {
		document.getElementById('rightWrapper').classList.toggle('hide')
		toggleCalcIcon(document.getElementById('btnimgCalc'))
		updateToolWrapperRight()
		minX = -2
		minY = -3
		drawAll()
	}
	saveStandartView()
	updateToolWrapperRight()
	observeRightWrapperSize()
	commitHistoryState()


	document.getElementById('undo').addEventListener('click', function (evt) {
		undoHistoryState()
	}, false)

	document.getElementById('clear').addEventListener('click', function (evt) {
		if (arrObjects.length != 0) {
			arrObjects = []
			commitHistoryState()
			activeElementID = null
			clearSound.play()
			activeObject = 'select'
			lineDrawing = false
			distanceSegmentDrawing = false
			reflectPointDrawing = false
			intersectDrawing = false
			arcMeasureDrawing = false
			reflectPointA = reflectPointB = null
			intersectLineA = intersectLineB = null
			reflectPointCreatedA = false
			arcMeasureA = arcMeasureB = arcMeasureCircle = null
			arcMeasureCreatedA = false
			circleTangentCircle = null
			drawAll()
			objectsContainer.innerHTML = ''
		}
	}, false)

	document.getElementById('redo').addEventListener('click', function (evt) {
		redoHistoryState()
	}, false)

	canvas.addEventListener("wheel", (e) => {
		if (e.deltaY < 0) {
			if (0 < tickY) {
				scaleY *= 1.05
				tickY--
				unitY = horizontalUnits[tickY]
				drawAll()
			}
			if (0 < tickX) {
				scaleX *= 1.05
				tickX--
				unitX = verticalUnits[tickX]
				drawAll()
			}
		}
		if (e.deltaY > 0) {
			if (tickY < horizontalUnits.length - 1) {
				scaleY *= .95
				tickY++
				unitY = horizontalUnits[tickY]
				drawAll()
			}
			if (tickX < verticalUnits.length - 1) {
				scaleX *= .95
				tickX++
				unitX = verticalUnits[tickX]
				drawAll()
			}
		}
	})
	canvas.addEventListener("mousemove", function (evt) {
		let hoverHitObject = getHitObject(getMousePos(evt))
		if (activeObject == 'select' && !grabbing && !hoverHitObject.hit) {
			let axisTarget = getAxisDragTarget(evt)
			if (axisTarget == 'xAxis') canvas.style.cursor = 'ew-resize'
			if (axisTarget == 'yAxis') canvas.style.cursor = 'ns-resize'
		}
		if (activeObject === 'line') {
			drawAll()
			if (lineDrawing) {
				let lineB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
				drawLineWithPoints(new mLineWithPoints(lineA, lineB, true))
			}
		}
		if (activeObject === 'linesegment') {
			drawAll()
			if (lineSegmentDrawing) {
				let lineSegmentB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawAll()
				drawLineSegment(new mLineSegment(lineSegmentA, lineSegmentB, true))
			}
		}
		if (activeObject === 'distancesegment') {
			drawAll()
			if (distanceSegmentDrawing) {
				let distanceSegmentB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawDistanceSegment(new mDistanceSegment(distanceSegmentA, distanceSegmentB, true))
			}
		}
		if (activeObject === 'reflectpoint') {
			drawAll()
			if (reflectPointDrawing) {
				let reflectPointB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				let reflected = getReflectedPoint(reflectPointA, reflectPointB)
				drawPoint(reflectPointB)
				drawPoint(new mPoint(reflected.a, reflected.b, true))
			}
		}
		if (activeObject === 'intersect') {
			drawAll()
			if (intersectDrawing) {
				let hovered = getHitObject(getMousePos(evt)).hit
				if (isIntersectableObject(hovered) && hovered.id != intersectLineA.id) {
					let intersection = getObjectIntersection(intersectLineA, hovered)
					intersection.points.forEach(point => drawPoint(new mPoint(point.a, point.b, true)))
				}
			}
		}
		if (activeObject === 'angle') {
			drawAll()
			if (!angleDrawing && angleA && !angleB) {
				let angleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawLineSegment(new mLineSegment(angleA, angleB, true))
			} else if (angleDrawing && angleA && angleB && !angleC) {
				let angleC = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawAngle(new mAngle(angleA, angleB, angleC, true))
			}
		}
		if (activeObject === 'circle2') {
			drawAll()
			if (circleDrawing) {
				let circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawAll()
				drawCircle2(new mCircle2(circleA, circleB, true))
			}
		}
		if (activeObject === 'circle3') {
			drawAll()
			if (!circleDrawing && circleA && !circleB) {
				let circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
			} else if (circleDrawing && circleA && circleB && !circleC) {
				let circleC = new mPoint(getMousePos(evt).x, getMousePos(evt).y, true)
				drawCircle3(new mCircle3(circleA, circleB, circleC, true))
			}
		}

		if (grabbing && activeObject == 'select' && hitObject) {
			canvas.style.cursor = 'grabbing'
			if (axisUnitDrag) {
				canvas.style.cursor = axisUnitDrag.axis == 'xAxis' ? 'ew-resize' : 'ns-resize'
				updateAxisUnitDrag(evt)
				drawAll()
			} else if (hitObject.hitType == 'point') {
				hitObject.hit.a = getMousePos(evt).x
				hitObject.hit.b = getMousePos(evt).y
				reprojectAllOnOther()
				drawAll()
				labelsCreator()
			} else if (!hitObject.hit && panStartMouse) {
				let dx = evt.clientX - panStartMouse.x
				let dy = evt.clientY - panStartMouse.y
				minX = panStartMinX - dx / scaleY
				minY = panStartMinY - dy / scaleX
				drawAll()
				labelsCreator()
			}
		}

	}, false)

	canvas.addEventListener("mousedown", function (evt) {
		hitObject = getHitObject(getMousePos(evt))
		if (evt.button == 0) {
			if (activeObject === 'circletangent') {
				handleCircleTangentMouseDown(evt)
				hitObject = { hit: null, hitType: null }
				return
			}
			if (activeObject === 'arcmeasure') {
				handleArcMeasureMouseDown(evt)
				hitObject = { hit: null, hitType: null }
				return
			}
			if (activeObject === 'intersect') {
				if (!intersectDrawing) {
					if (isIntersectableObject(hitObject.hit)) {
						intersectLineA = hitObject.hit
						intersectDrawing = true
						showToast('Kesiştir', 'Şimdi ikinci nesneyi seçiniz.')
					} else {
						showToast('Kesiştir', 'Önce kesiştirilecek nesneyi seçiniz.')
					}
				} else {
					if (isIntersectableObject(hitObject.hit) && hitObject.hit.id != intersectLineA.id) {
						intersectLineB = hitObject.hit
						let points = createIntersectionPoints(intersectLineA, intersectLineB)
						points.forEach(point => arrObjects.push(point))
						activeElementID = points[0].id
						commitDrawingHistoryState()
						intersectDrawing = false
						intersectLineA = intersectLineB = null

						finishToolAndReturnSelect()


					} else {
						showToast('Kesiştir', 'Farklı bir nesne seçiniz.')
					}
				}
				hitObject = { hit: null, hitType: null }
			}
			if (activeObject === 'point') {
				let ownObject = hitObject.hit
				let point
				if (!hitObject.hit) {
					point = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
				} else if (hitObject.hitType == 'circle2') {
					let r = distanceAB(ownObject.A, ownObject.B)
					let angle = Math.atan2(getMousePos(evt).y - ownObject.A.b, getMousePos(evt).x - ownObject.A.a)
					let pointX = ownObject.A.a + r * Math.cos(angle);
					let pointY = ownObject.A.b + r * Math.sin(angle);
					point = new mPoint(pointX.toFixed(2), pointY.toFixed(2))
					point.onOther.push({
						type: "onCircle",
						circleId: ownObject.id
					})
				} else if (hitObject.hitType == 'circle3') {
					let r = getCircle3RA(ownObject).r
					let angle = Math.atan2(getMousePos(evt).y - getCircle3RA(ownObject).n, getMousePos(evt).x - getCircle3RA(ownObject).m)
					let pointX = getCircle3RA(ownObject).m + r * Math.cos(angle);
					let pointY = getCircle3RA(ownObject).n + r * Math.sin(angle);
					point = new mPoint(pointX.toFixed(2), pointY.toFixed(2))
					point.onOther.push({
						type: "onCircle",
						circleId: ownObject.id
					})
				} else if (hitObject.hitType == 'circleR') {
					let r = ownObject.r
					let angle = Math.atan2(getMousePos(evt).y - ownObject.A.b, getMousePos(evt).x - ownObject.A.a)
					let pointX = ownObject.A.a + r * Math.cos(angle);
					let pointY = ownObject.A.b + r * Math.sin(angle);
					point = new mPoint(pointX.toFixed(2), pointY.toFixed(2))
					point.onOther.push({
						type: "onCircle",
						circleId: ownObject.id
					})
				} else if (isPointAttachableLine(ownObject)) {
					let projection = getProjectionOnLine(ownObject, getMousePos(evt).x, getMousePos(evt).y)
					if (projection.status) {
						point = new mPoint(Number(projection.a).toFixed(2), Number(projection.b).toFixed(2))
						point.onOther.push({
							type: "onLine",
							lineId: ownObject.id
						})
					}
				} else if (hitObject.hitType == 'circleTangent') {
					let projection = getProjectionOnCircleTangent(ownObject, getMousePos(evt).x, getMousePos(evt).y)
					if (projection.status) {
						point = new mPoint(Number(projection.a).toFixed(2), Number(projection.b).toFixed(2))
						point.onOther.push({
							type: "onCircleTangent",
							tangentId: ownObject.id,
							lineIndex: projection.lineIndex,
						})
					}
				} else {
					console.log('Mouse Down: Type bulunamadı.')
				}

				if (!point) return
				arrObjects.push(point)
				activeElementID = point.id
				commitHistoryState()
				labelsCreator()
			}
			if (activeObject === 'line') {
				if (lineDrawing == false) {
					lineA
					hitObject.hitType == 'point' ? lineA = hitObject.hit : lineA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(lineA)
						trackTransientObject(lineA)
					}
					lineDrawing = true
				} else {
					lineB
					hitObject.hitType == 'point' ? lineB = hitObject.hit : lineB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(lineB)
						trackTransientObject(lineB)
					}
					let lwp = new mLineWithPoints(lineA, lineB)
					arrObjects.push(lwp)
					activeElementID = lwp.id
					commitDrawingHistoryState()
					lineDrawing = false
					lineA = lineB = null

					finishToolAndReturnSelect()
				}
			}

			if (activeObject === 'linesegment') {
				let mousePos = getMousePos(evt)
				if (lineSegmentDrawing == false) {
					let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
					lineSegmentA = pointResult.point
					if (pointResult.created) {
						arrObjects.push(lineSegmentA)
						trackTransientObject(lineSegmentA)
					}
					lineSegmentDrawing = true
				} else {
					let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
					lineSegmentB = pointResult.point
					if (pointResult.created) {
						arrObjects.push(lineSegmentB)
						trackTransientObject(lineSegmentB)
					}
					let ls = new mLineSegment(lineSegmentA, lineSegmentB)
					arrObjects.push(ls)
					activeElementID = ls.id
					commitDrawingHistoryState()
					lineSegmentDrawing = false
					lineSegmentA = lineSegmentB = null

					finishToolAndReturnSelect()
				}
			}

			if (activeObject === 'distancesegment') {
				if (distanceSegmentDrawing == false) {
					distanceSegmentA
					hitObject.hitType == 'point' ? distanceSegmentA = hitObject.hit : distanceSegmentA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(distanceSegmentA)
						trackTransientObject(distanceSegmentA)
					}
					distanceSegmentDrawing = true
				} else {
					distanceSegmentB
					hitObject.hitType == 'point' ? distanceSegmentB = hitObject.hit : distanceSegmentB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(distanceSegmentB)
						trackTransientObject(distanceSegmentB)
					}
					let ds = new mDistanceSegment(distanceSegmentA, distanceSegmentB)
					arrObjects.push(ds)
					activeElementID = ds.id
					commitDrawingHistoryState()
					distanceSegmentDrawing = false
					distanceSegmentA = distanceSegmentB = null

					finishToolAndReturnSelect()

				}
			}

			if (activeObject === 'reflectpoint') {
				if (reflectPointDrawing == false) {
					if (hitObject.hitType == 'point') {
						reflectPointA = hitObject.hit
						reflectPointCreatedA = false
					} else {
						reflectPointA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						arrObjects.push(reflectPointA)
						trackTransientObject(reflectPointA)
						reflectPointCreatedA = true
					}
					reflectPointDrawing = true
				} else {
					if (hitObject.hitType == 'point') {
						reflectPointB = hitObject.hit
					} else {
						reflectPointB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						arrObjects.push(reflectPointB)
						trackTransientObject(reflectPointB)
					}

					let reflectedPoint = createReflectedPoint(reflectPointA, reflectPointB)
					arrObjects.push(reflectedPoint)
					activeElementID = reflectedPoint.id
					commitDrawingHistoryState()
					reflectPointDrawing = false
					reflectPointA = reflectPointB = null

					finishToolAndReturnSelect()

					reflectPointCreatedA = false
				}
			}

			if (activeObject === 'circle2') {
				if (circleDrawing == false) {
					circleA
					hitObject.hitType == 'point' ? circleA = hitObject.hit : circleA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(circleA)
						trackTransientObject(circleA)
					}
					circleDrawing = true
				} else {
					circleB
					hitObject.hitType == 'point' ? circleB = hitObject.hit : circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(circleB)
						trackTransientObject(circleB)
					}
					let c2 = new mCircle2(circleA, circleB)
					arrObjects.push(c2)
					activeElementID = c2.id
					commitDrawingHistoryState()
					circleDrawing = false
					circleA = circleB = null

					finishToolAndReturnSelect()
				}
			}
			if (activeObject === 'circle3') {
				if (!circleDrawing) {
					if (!circleA) {
						circleA
						hitObject.hitType == 'point' ? circleA = hitObject.hit : circleA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						if (hitObject.hitType != 'point') {
							arrObjects.push(circleA)
							trackTransientObject(circleA)
						}
					} else {
						circleB
						hitObject.hitType == 'point' ? circleB = hitObject.hit : circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						if (hitObject.hitType != 'point') {
							arrObjects.push(circleB)
							trackTransientObject(circleB)
						}
						circleDrawing = true
					}
				} else {
					circleC
					hitObject.hitType == 'point' ? circleC = hitObject.hit : circleC = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						arrObjects.push(circleC)
						trackTransientObject(circleC)
					}
					let c3 = new mCircle3(circleA, circleB, circleC)
					arrObjects.push(c3)
					activeElementID = c3.id
					commitDrawingHistoryState()
					circleDrawing = false
					circleA = circleB = circleC = null

					finishToolAndReturnSelect()
				}
			}
			if (activeObject === 'angle') {
				let mousePos = getMousePos(evt)
				if (!angleDrawing) {
					if (!angleA) {
						let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
						angleA = pointResult.point
						if (pointResult.created) {
							arrObjects.push(angleA)
							trackTransientObject(angleA)
						}
					} else {
						let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
						angleB = pointResult.point
						if (pointResult.created) {
							arrObjects.push(angleB)
							trackTransientObject(angleB)
						}
						angleDrawing = true
					}
				} else {
					let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
					angleC = pointResult.point
					if (pointResult.created) {
						arrObjects.push(angleC)
						trackTransientObject(angleC)
					}
					let a = new mAngle(angleA, angleB, angleC)
					arrObjects.push(a)
					activeElementID = a.id
					commitDrawingHistoryState()
					angleDrawing = false
					angleA = angleB = angleC = null

					finishToolAndReturnSelect()
				}
			}
			if (hitObject.hit) {
				activeElementID = hitObject.hit.id
				drawAll()
			}
		}

		if (activeObject == 'select') {
			grabbing = true
			canvas.style.cursor = 'grabbing'
			firstMousePos = getMousePos(evt)
			if (!hitObject.hit) {
				let axisTarget = getAxisDragTarget(evt)
				if (axisTarget) {
					axisUnitDrag = {
						axis: axisTarget,
						startX: evt.clientX,
						startY: evt.clientY,
						startTick: axisTarget == 'xAxis' ? tickY : tickX,
						startScale: axisTarget == 'xAxis' ? scaleY : scaleX,
					}
					canvas.style.cursor = axisTarget == 'xAxis' ? 'ew-resize' : 'ns-resize'
				} else {
					panStartMouse = { x: evt.clientX, y: evt.clientY }
					panStartMinX = minX
					panStartMinY = minY
				}
			}
		}
		drawAll()
		labelsCreator()
	}, false)

	canvas.addEventListener("mouseup", function (evt) {
		canvas.style.cursor = 'default'
		lastMousePos = getMousePos(evt)

		if (grabbing && activeObject == 'select') {

			if (hitObject.hitType == 'point') {
				hitObject.hit.a = lastMousePos.x
				hitObject.hit.b = lastMousePos.y
				reprojectAllOnOther()
				commitHistoryState()
			}

			grabbing = false
			panStartMouse = null
			axisUnitDrag = null
			lastMousePos = null
			drawAll()
			labelsCreator()
		}
		firstMousePos = lastMousePos = panStartMouse = axisUnitDrag = null
	}, false)

	document.addEventListener("keydown", function (evt) {
		if (evt.key == 'Escape') {
			cancelActiveToolAndReturnSelect()
		}
	}, false)

	let reSizer = document.querySelector(".reSizer")
	let rightWrapper = document.querySelector(".rightWrapper")

	function initResizerFunction(reSizer, rightWrapper) {
		let x, w

		function mouseDownHand(e) {
			let rightToolbar = document.getElementById('rightToolbar')

			rightWrapper.style.transition = "all 0s"
			if (rightToolbar) rightToolbar.style.transition = "right 0s"

			x = e.clientX
			let sbWidth = window.getComputedStyle(rightWrapper).width
			w = parseInt(sbWidth, 10)
			document.addEventListener('mousemove', mouseMoveHand)
			document.addEventListener('mouseup', mouseUpHand)
		}
		function mouseMoveHand(evt) {
			let dx = evt.clientX - x
			let cw = w - dx
			let minWidth = 260
			let maxWidth = Math.min(700, innerWidth - 90)
			cw = Math.max(minWidth, Math.min(maxWidth, cw))
			rightWrapper.style.width = cw + "px"
			updateToolWrapperRight()
		}
		function mouseUpHand() {
			let rightToolbar = document.getElementById('rightToolbar')

			rightWrapper.style.transition = "all 1s"
			if (rightToolbar) rightToolbar.style.transition = ""

			document.removeEventListener('mouseup', mouseUpHand)
			document.removeEventListener('mousemove', mouseMoveHand)
		}
		reSizer.addEventListener('mousedown', mouseDownHand)
	}

	initResizerFunction(reSizer, rightWrapper)
}

connectRadialToolbar()

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeLegacyApp, { once: true })
} else {
	initializeLegacyApp()
}
