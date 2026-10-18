import { math } from '../math'
import { createGeometryModels } from '../geometry/models'
import { createFunctionModels } from '../geometry/function-models'
import {
	distanceAB, getReflectedPoint, getLineDescriptor, numericPoint,
	getProjectionOnLine, getProjectionOnSegment, getProjectionOnAngle, getProjectionOnCircle,
	getCircleDescriptor, calculateAngle, getAngleMeasure, normalizeDegree,
	getPointAngleOnCircle, isPointAtCircleCenter, isPointOnCircleData, isAngleInCcwArc,
	getPositiveArcMeasure, createLineEquation,
} from '../geometry/primitives'
import { getObjectIntersection } from '../geometry/intersections'
import {
	getCircleTangentLines, getProjectionOnCircleTangent, getCircleTangentTouchPoint,
} from '../geometry/tangents'
import { composeExpressions, linearExpression } from '../math/function-algebra'
import { createGridRenderer } from '../rendering/coordinate-grid'
import { createCanvasSurface } from '../rendering/canvas-surface'
import { createFrameRenderer, createSceneOrder } from '../rendering/frame-renderer'
import { createFunctionEvaluator } from '../rendering/function-evaluator'
import { createCoordinateTransform } from '../rendering/coordinate-transform'
import { drawFunctionPlot } from '../rendering/function-plotter'

const {
	mPoint,
	mCircleR,
	mCircle2,
	mCircle3,
	mAngle,
	mArcMeasure,
	mLineWithPoints,
	mLineSegment,
	mDistanceSegment,
	mCircleTangent,
} = createGeometryModels({
	createName,
	nextId: idCounter,
	randomColor: getRandomColor,
})

const {
	mVerLine,
	mLineWithEquation,
	mSequence,
	mLimit,
	mFunction,
	mFunctionComposition,
	mTangent,
	mTangentHX,
	mDerivative,
	mSectionalFunctions,
	updateTangent,
	updateTangentHX,
} = createFunctionModels({
	createName,
	nextId: idCounter,
	randomColor: getRandomColor,
	createPoint: (a, b, temp) => new mPoint(a, b, temp),
	createLineWithPoints: (A, B, temp) => new mLineWithPoints(A, B, temp),
})

// Geometri ve fonksiyon modelleri TypeScript modüllerinden gelir; kalan motor aşamalı taşınır.

function normalizeLine(m, n, spacing = '') {
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
		result += `${spacing}+${spacing}${displayN}`;
	} else {
		result += `${spacing}-${spacing}${displayN.slice(1)}`;
	}
	return result;
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

function isPointAttachableLine(obj) {
	if (!obj) return false
	return obj.type == 'lineWithPoints' || obj.type == 'lineWithEquation' || obj.type == 'verLine' || obj.type == 'lineSegment'
}

function createPointFromHitOrMouse(hit, mousePos) {
	if (hit.hitType == 'point') {
		return { point: hit.hit, created: false }
	}

	if (isIntersectableCircle(hit.hit)) {
		const point = createPointOnCircle(hit.hit, mousePos)
		if (point) return { point, created: true }
	}

	if (isPointAttachableLine(hit.hit)) {
		let projection = getProjectionOnLine(hit.hit, mousePos.x, mousePos.y)
		if (projection.status) {
			let point = new mPoint(projection.a, projection.b)
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
			let point = new mPoint(projection.a, projection.b)
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
			let point = new mPoint(projection.a, projection.b)
			point.onOther.push({
				type: "onAngle",
				angleId: hit.hit.id
			})
			return { point: point, created: true }
		}
	}

	return { point: new mPoint(mousePos.x, mousePos.y), created: true }
}

function addCircleTangentWithTouchPoints(point, circle) {
	const tangent = new mCircleTangent(point, circle)
	arrObjects.push(tangent)
	const data = getCircleTangentLines(point, circle)
	if (data.status) {
		data.tangentPoints.forEach((touch, pointIndex) => {
			const touchPoint = new mPoint(touch.a, touch.b)
			touchPoint.onOther.push({ type: 'circleTangentTouchPoint', tangentId: tangent.id, pointIndex })
			arrObjects.push(touchPoint)
		})
	}
	return tangent
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
		item.geometryValid !== false && Number.isFinite(Number(item.a)) &&
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
	const projection = getProjectionOnCircle(circle, mousePos.x, mousePos.y)
	if (!projection.status) return null
	const point = new mPoint(projection.a, projection.b)
	point.onOther.push({ type: 'onCircle', circleId: circle.id })
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

const gridRenderer = createGridRenderer()
const sceneOrder = createSceneOrder()
const functionEvaluator = createFunctionEvaluator()
let renderPreview = null
const frameRenderer = createFrameRenderer(paintScene)

if (import.meta.hot) {
	import.meta.hot.dispose(() => frameRenderer.dispose())
}

// Belge bağımlılıkları kartlar/geçmiş için hemen eşitlenir; yalnız boyama ertelenir.
function drawAll(preview = null) {
	syncCoordinates()
	reprojectAllOnOther()
	renderPreview = preview
	frameRenderer.request()
}

function paintScene() {
	surface.resize()
	surface.prepare()
	syncCoordinates()
	gridRenderer.draw(ctx, {
		width: surface.width,
		height: surface.height,
		minX, minY, scaleX, scaleY, unitX, unitY,
	}, surface.pixelRatio)
	if (angleA && angleB) drawLineSegment(new mLineSegment(angleA, angleB, true))

	for (const item of sceneOrder.get(arrObjects)) {
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
	renderPreview?.()
}

function drawPoint(point) {
	if (!point.visibility || point.geometryValid === false) return
	if (!Number.isFinite(Number(point.a)) || !Number.isFinite(Number(point.b))) return
	ctx.beginPath()

	let pSize
	point.id == activeElementID ? pSize = point.size + 2 : pSize = point.size
	let pColor = point.color
	if (point.temp) pColor = '#000000'

	ctx.strokeStyle = 'black'
	ctx.fillStyle = pColor
	ctx.arc(pixelX(point.a), pixelY(point.b), pSize, 0, 2 * Math.PI)
	ctx.lineWidth = 1
	if (!point.temp) text2canvas(pixelX(point.a) - 10, pixelY(point.b) - 5, pColor, 'center', 'bold 15px arial', point.name)
	ctx.fill()
	ctx.stroke()
	ctx.closePath()
}

function getCircleCanvasRadii(r) {
	return coordinates.radiusToPixels(Number(r))
}

function drawCircleR(circle) {
	if (!circle.visibility || !getCircleDescriptor(circle).status) return

	let sp = new mPoint(Number(circle.A.a) + Number(circle.r), circle.A.b, true)
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
	ctx.ellipse(pixelX(circle.A.a), pixelY(circle.A.b), canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas(pixelX(circle.A.a) - canvasR.x * 0.75, pixelY(circle.A.b) - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
	text2canvas(pixelX((Number(circle.A.a) + Number(sp.a)) / 2), pixelY((Number(circle.A.b) + Number(sp.b)) / 2), cColor, 'center', 'bold 15px arial', 'r = ' + formatDisplayNumber(circle.r))
	ctx.stroke()
	ctx.closePath()
}

function drawCircle2(circle) {
	if (!circle.visibility) return
	const data = getCircleDescriptor(circle)
	if (!data.status) return
	const r = data.r
	let cSize
	circle.id == activeElementID ? cSize = circle.size + 1 : cSize = circle.size
	let cColor = circle.color
	if (circle.temp) cColor = '#000000'
	let canvasR = getCircleCanvasRadii(r)
	ctx.beginPath()
	ctx.strokeStyle = cColor
	ctx.ellipse(pixelX(circle.A.a), pixelY(circle.A.b), canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas(pixelX(circle.A.a) - canvasR.x * 0.75, pixelY(circle.A.b) - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
	ctx.stroke()
	ctx.closePath()
}

function drawCircle3(circle) {
	if (!circle.visibility) return

	let mr = getCircleDescriptor(circle)
	if (!mr.status) return
	let cSize
	circle.id == activeElementID ? cSize = circle.size + 1 : cSize = circle.size
	let cColor = circle.color
	if (circle.temp) cColor = '#000000'
	let canvasR = getCircleCanvasRadii(mr.r)
	ctx.beginPath()
	ctx.strokeStyle = cColor
	ctx.ellipse(pixelX(mr.m), pixelY(mr.n), canvasR.x, canvasR.y, 0, 0, 2 * Math.PI)
	ctx.lineWidth = cSize
	if (!circle.temp) text2canvas(pixelX(mr.m) - canvasR.x * 0.75, pixelY(mr.n) - canvasR.y * 0.75, cColor, 'center', 'bold 15px arial', circle.name)
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
	ctx.moveTo(pixelX(vline.x), surface.height)
	ctx.lineTo(pixelX(vline.x), 0)
	if (!vline.temp) text2canvas(pixelX(vline.x) + 10, 15, vlColor, 'center', 'bold 15px arial', vline.name)
	ctx.fill()
	ctx.stroke()
	ctx.closePath()
}

// Doğrular yalnız görünür matematik dikdörtgenine kadar hesaplanır.
function drawLineWithEquation(line) {
	if (!line.visibility) return
	const m = Number(line.m)
	const n = Number(line.n)
	if (!Number.isFinite(m) || !Number.isFinite(n)) return
	const bounds = coordinates.bounds
	let startX = Math.max(bounds.left, line.startX == null ? bounds.left : Number(line.startX))
	let endX = Math.min(bounds.right, line.endX == null ? bounds.right : Number(line.endX))
	if (m === 0) {
		if (n < bounds.bottom || n > bounds.top) return
	} else {
		const xAtBottom = (bounds.bottom - n) / m
		const xAtTop = (bounds.top - n) / m
		startX = Math.max(startX, Math.min(xAtBottom, xAtTop))
		endX = Math.min(endX, Math.max(xAtBottom, xAtTop))
	}
	if (!Number.isFinite(startX) || !Number.isFinite(endX) || startX > endX) return

	const size = line.id == activeElementID ? line.size + 1 : line.size
	const color = line.temp && !line.useOwnColorForTemp ? '#000000' : line.color
	ctx.beginPath()
	ctx.strokeStyle = color
	ctx.lineWidth = size
	ctx.moveTo(pixelX(startX), pixelY(m * startX + n))
	ctx.lineTo(pixelX(endX), pixelY(m * endX + n))
	ctx.stroke()
	ctx.closePath()
	if (!line.temp) {
		const labelX = pixelX(startX) + (pixelX(endX) - pixelX(startX)) * 0.2
		const labelY = pixelY(m * coordinates.pixelToX(labelX) + n)
		text2canvas(labelX + 5, Math.max(15, Math.min(surface.height - 5, labelY - 8)), color, 'center', 'bold 15px arial', line.name)
	}
}

function drawLineWithPoints(pl, useOwnColorForTemp = false) {
	if (!pl.visibility) return
	if (Number(pl.A.a) === Number(pl.B.a)) {
		if (Number(pl.A.b) === Number(pl.B.b)) return
		drawVerLine({ ...pl, x: pl.A.a, color: pl.temp && !useOwnColorForTemp ? '#000000' : pl.color })
		return
	}
	const equation = createLineEquation(pl.A, pl.B)
	drawLineWithEquation({ ...pl, m: equation.m, n: equation.c, useOwnColorForTemp })
}

function drawCircleTangent(tangent) {
	if (!tangent.visibility) return

	let tangentData = getCircleTangentLines(tangent.A, tangent.circle)
	if (!tangentData.status) return

	tangentData.lines.forEach(line => {
		drawLineWithPoints({ ...line, color: tangent.color,
			size: tangent.id == activeElementID ? tangent.size + 1 : tangent.size,
			visibility: true, temp: true, id: tangent.id }, true)
	})

	if (!tangent.temp) {
		let labelX = pixelX(tangent.A.a) + 12
		let labelY = pixelY(tangent.A.b) - 12
		text2canvas(labelX, labelY, tangent.color, 'center', 'bold 15px arial', tangent.name)
	}
}

function drawFunction(func, temp = false, lineWidth = null) {
	if (!func.visibility) return
	const expression = func.type === 'sequence'
		? func.func.replace(/(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g, 'x')
		: func.func
	drawFunctionPlot(ctx, {
		expression,
		transform: coordinates,
		width: surface.width,
		height: surface.height,
		color: func.color,
		lineWidth: lineWidth ?? (func.id == activeElementID ? func.size + 1 : func.size),
		startX: func.startX == null ? null : Number(func.startX),
		endX: func.endX == null ? null : Number(func.endX),
		dashed: temp,
	}, functionEvaluator)
}

function drawSequence(seq) {
	if (!seq.visibility) return
	const expression = seq.func.replace(/(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g, 'x')
	drawFunction({ ...seq, func: expression, type: 'function', startX: seq.start, endX: seq.end }, true)

	// Görünür olmayan indisler hesaplanmaz; sıkışan noktalar ekran çözünürlüğüne göre seyreltilir.
	const first = Math.max(seq.start, Math.ceil(coordinates.bounds.left))
	const last = Math.min(seq.end, Math.floor(coordinates.bounds.right))
	if (first > last) return
	const budget = Math.max(1, Math.ceil(surface.width / 8))
	const step = Math.max(1, Math.ceil((last - first + 1) / budget))
	const count = Math.min(budget, Math.floor((last - first) / step) + 1)
	const size = seq.id == activeElementID ? seq.size + 1 : seq.size
	for (let index = 0; index < count; index++) {
		const n = first + index * step
		const y = functionEvaluator.evaluate(expression, n)
		if (y === null) continue
		const cx = pixelX(n)
		const cy = pixelY(y)
		if (!Number.isFinite(cy) || cy < -size || cy > surface.height + size) continue
		ctx.beginPath()
		ctx.strokeStyle = 'black'
		ctx.fillStyle = seq.color
		ctx.lineWidth = 1
		ctx.arc(cx, cy, size, 0, 2 * Math.PI)
		text2canvas(cx - 10, cy - 5, seq.color, 'center', 'bold 15px arial', seq.name + n)
		ctx.fill()
		ctx.stroke()
		ctx.closePath()
	}
}

function drawFunctionGuides(expression, x, color, dashed = false) {
	const A = new mPoint(x, 0, true)
	drawPoint(A)
	const y = functionEvaluator.evaluate(expression, Number(x))
	if (y === null) return
	const B = new mPoint(x, y, true)
	const C = new mPoint(0, y, true)
	const vertical = new mLineSegment(A, B, true)
	const horizontal = new mLineSegment(B, C, true)
	vertical.color = horizontal.color = color
	vertical.lineDash = horizontal.lineDash = dashed ? [2, 5] : []
	drawLineSegment(vertical)
	drawLineSegment(horizontal)
	drawPoint(B)
	drawPoint(C)
}

function drawLimit(lim) {
	if (!lim.visibility) return
	drawFunction(lim)
	drawFunctionGuides(lim.func, lim.approachVal, lim.color)
	if (lim.id == activeElementID) {
		drawFunctionGuides(lim.func, lim.approachValRight, lim.color, true)
		drawFunctionGuides(lim.func, lim.approachValLeft, lim.color, true)
	}
}

function drawTangent(tur) {
	if (!tur.visibility) return
	drawFunction(tur)
	drawFunctionGuides(tur.func, tur.approachVal, tur.color, true)
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
	if (activeElementID == der.id) drawFunction(der.func, true)
}
function drawFunctionComposition(funcComp) {
	if (!funcComp.visibility) return
	drawFunction(funcComp)
}

function drawLineSegment(ls) {
	if (!ls.visibility || !numericPoint(ls.A) || !numericPoint(ls.B)) return
	let lsSize
	ls.id == activeElementID ? lsSize = ls.size + 1 : lsSize = ls.size
	let lsColor = ls.color
	if (ls.temp) lsColor = '#000000'
	ctx.beginPath()
	ctx.strokeStyle = lsColor
	ctx.lineWidth = lsSize
	if (ls.temp) ctx.setLineDash(ls.lineDash)
	ctx.moveTo(pixelX(ls.A.a), pixelY(ls.A.b))
	ctx.lineTo(pixelX(ls.B.a), pixelY(ls.B.b))
	if (!ls.temp) text2canvas(pixelX(((Number(ls.A.a) + Number(ls.B.a)) / 2)) - 10, pixelY(((Number(ls.A.b) + Number(ls.B.b)) / 2)) - 10, lsColor, 'center', 'bold 15px arial', ls.name)
	ctx.stroke()
	ctx.setLineDash([])
	ctx.closePath()
}

function formatDistanceValue(value) {
	return Number.isFinite(value) ? formatDisplayNumber(value) : '∅'
}

function formatAngleValue(value) {
	return Number.isFinite(value) ? formatDisplayNumber(value) : '∅'
}

function drawDistanceSegment(ds) {
	if (!ds.visibility) return

	let dsColor = ds.temp ? '#000000' : ds.color
	let distance = distanceAB(ds.A, ds.B)
	let midX = pixelX(((Number(ds.A.a) + Number(ds.B.a)) / 2))
	let midY = pixelY(((Number(ds.A.b) + Number(ds.B.b)) / 2))
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
		let x = pixelX((circleData.m + radius * Math.cos(angle)))
		let y = pixelY((circleData.n + radius * Math.sin(angle)))
		if (i == 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.stroke()
	ctx.closePath()

	let midAngle = (arcInfo.startAngle + arcInfo.span / 2) * Math.PI / 180
	let labelRadius = radius + 0.2
	let labelX = pixelX((circleData.m + labelRadius * Math.cos(midAngle)))
	let labelY = pixelY((circleData.n + labelRadius * Math.sin(midAngle)))
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
	let labelX = pixelX((circleData.m + labelRadius * Math.cos(midAngle)))
	let labelY = pixelY((circleData.n + labelRadius * Math.sin(midAngle)))
	let label = arcMeasure.temp ? formatAngleValue(arcInfo.span) + '\u00b0' : arcMeasure.name + '=' + formatAngleValue(arcInfo.span) + '\u00b0'
	text2canvas(labelX, labelY, arcColor, 'center', 'bold 15px arial', label)
}

function drawScaledAngleArc(cx, cy, startAngle, span, radius, color, lineWidth) {
	let steps = Math.max(16, Math.ceil(span / 6))
	const { x: radiusX, y: radiusY } = getCircleCanvasRadii(radius)

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
	ctx.moveTo(pixelX(ag.A.a), pixelY(ag.A.b))
	ctx.lineTo(pixelX(ag.B.a), pixelY(ag.B.b))
	ctx.lineTo(pixelX(ag.C.a), pixelY(ag.C.b))
	ctx.stroke()
	ctx.closePath()

	//Sembol ve Ölçü
	let angles = calculateAngle(ag)
	let angleBetween = getAngleMeasure(ag)
	if (!Number.isFinite(angleBetween)) return
	let cx = pixelX(ag.B.a)
	let cy = pixelY(ag.B.b)
	let startAngle = 360 - angles.angleBC
	let endAngle = startAngle + angleBetween

	drawScaledAngleArc(cx, cy, startAngle, angleBetween, 0.2, agColor, agSize + 1)
	let textAngle = (startAngle + angleBetween / 2) * Math.PI / 180
	const { x: textRadiusX, y: textRadiusY } = getCircleCanvasRadii(0.35)
	text2canvas(cx + textRadiusX * Math.cos(textAngle), cy + textRadiusY * Math.sin(textAngle), agColor, 'center', 'bold 15px arial', ag.name + '=' + formatAngleValue(angleBetween) + '\u00b0')
}

function drawSectionalFunctions(sf) {
	if (!sf.visibility) return
	const lineWidth = sf.id == activeElementID ? sf.size + 1 : sf.size
	sf.secFuncs.forEach(func => {
		drawFunction(func, false, lineWidth)
	})
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
	if (!Number.isSafeInteger(start) || start < 1) return { status: false };
	if (!Number.isSafeInteger(end) || end < start) return { status: false };
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

// Komut çözümleme sırasında model oluşturulmaz; yalnız gerçek simge başvuruları açılır.
function getObjectExpression(object) {
	if (!object) return null
	if (object.type === 'derivative') return object.func.func
	return typeof object.func === 'string' ? object.func : null
}

function resolveFunctionExpression(input) {
	if (typeof input !== 'string' || !input.trim()) return null
	try {
		const composition = isFunctionCompositions(input)
		if (composition.status) {
			const functions = composition.functions.map(resolveFunctionExpression)
			if (functions.some(expression => expression === null)) return null
			return composeExpressions(functions)
		}
		let replaced = false
		const tree = math.parse(input).transform((node, path, parent) => {
			if (!math.isSymbolNode(node) || node.name === 'x'
				|| (parent && math.isFunctionNode(parent) && path === 'fn')) return node
			const expression = getObjectExpression(arrObjects.find(item => item.name === node.name))
			if (expression === null) {
				if (/^[fghpqr][0-9]*$/i.test(node.name)) throw new Error('Fonksiyon bulunamadı.')
				return node
			}
			replaced = true
			return new math.ParenthesisNode(math.parse(expression))
		})
		const expression = replaced ? tree.toString({ implicit: 'show' }) : input.trim()
		const result = isFunction(expression)
		return result.status ? result.func : null
	} catch {
		return null
	}
}

function isDerivative(input) {
	if (typeof input !== 'string') return { status: false }
	const match = input.trim().match(/^Türev\s*\((.*)\)$/i)
	if (!match) return { status: false }
	const expression = resolveFunctionExpression(match[1])
	return expression === null ? { status: false } : { type: 'derivative', func: expression, status: true }
}

function isFunctionCompositions(str) {
	const funcCompRe = /^\s*Bileşke\s*\((.+)\)\s*$/i
	const compMatch = str.match(funcCompRe)
	if (compMatch) {
		const inside = compMatch[1]
		const functions = splitTopLevelArgs(inside)
		if (!functions.length || functions.some(part => !part) || inside.trim().endsWith(',')) return { status: false }
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
			const parts = splitTopLevelArgs(seg);
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
		if (msg.includes('undefined symbol') || msg.includes('undefined function') || msg.includes('not defined')) {
			return { status: false };
		}
	}

	return {
		type: "function",
		func: expr,
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
	syncCoordinates()
	const bounds = coordinates.bounds
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
			input.value = item.name + ': y = ' + normalizeLine(item.m, item.n, ' ')
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
			output.value = item.name + ': y = ' + normalizeLine(item.tngLine.m, item.tngLine.n)
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
			input.value = item.name + ': y = ' + item.func.func
			output.value = item.derFunc.name + ': y = ' + item.derFunc.func
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
		} else {
			console.log('labelsCreator: Type bulunamadı.')
		}
		if (item.type === 'point' && item.geometryValid === false && !getIntersectionPointConstraint(item)) output.value = '∅'
		if (isIntersectableCircle(item) && !getCircleDescriptor(item).status) output.value = '∅'
		sliderA.min = bounds.left - unitY
		sliderA.max = bounds.right + unitY
		sliderB.max = bounds.top + unitX
		sliderB.min = bounds.bottom - unitX
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
			sliderA.max = Math.max(Number(item.r), bounds.right - bounds.left, bounds.top - bounds.bottom)
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
			let mostLeft = bounds.left - unitY
			let mostRight = bounds.right + unitY

			sliderA.min = item.approachVal * 1
			sliderA.max = mostRight
			sliderA.value = verticalMNumberRight
			labelA.innerHTML = sliderA.min + '⁺ = ' + verticalMNumberRight

			sliderB.min = mostLeft
			sliderB.max = item.approachVal * 1
			sliderB.value = verticalMNumberLeft
			labelB.innerHTML = sliderB.max + '⁻ = ' + verticalMNumberLeft
		} else if (item.type == 'tangent') {
			let mostLeft = bounds.left - unitY
			let mostRight = bounds.right + unitY
			sliderA.min = mostLeft
			sliderA.max = mostRight
			sliderA.step = "0.01"
			sliderA.value = item.approachVal
			labelA.innerHTML = 'x = ' + item.approachVal
		} else if (item.type == 'tangentHX') {
			let mostLeft = bounds.left - unitY
			let mostRight = bounds.right + unitY
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
	syncCoordinates()
	const pixel = getCanvasPixelPos(evt)
	return { x: coordinates.pixelToX(pixel.x), y: coordinates.pixelToY(pixel.y) }
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
			try {
				updateTangent(item, sliderA.value)
			} catch {
				sliderA.value = item.approachVal
				showToast('Teğet', 'Bu konumda sonlu bir gerçek teğet hesaplanamıyor.')
				return
			}
			input.value = 'Teğet(' + item.func + ',' + item.approachVal + ')'
			output.value = item.name + ': y = ' + normalizeLine(item.tngLine.m, item.tngLine.n)
			labelA.innerHTML = 'x = ' + sliderA.value
		} else if (item.type == 'tangentHX') {
			try {
				updateTangentHX(item, sliderA.value, sliderB.value)
			} catch {
				sliderA.value = item.approachVal
				sliderB.value = item.h
				showToast('Teğet', 'Bu konumda sonlu gerçek noktalar hesaplanamıyor.')
				return
			}

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
			item.func = linearExpression(item.m, item.n)
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
const surface = createCanvasSurface(canvas, ctx)
surface.resize()
surface.prepare()

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

let coordinateView = null
let coordinates = null

// Görünüm değişmedikçe bölme ve dönüşüm sabitleri yeniden hesaplanmaz.
function syncCoordinates() {
	if (coordinateView && coordinateView.width === surface.width && coordinateView.height === surface.height
		&& coordinateView.minX === minX && coordinateView.minY === minY
		&& coordinateView.scaleX === scaleX && coordinateView.scaleY === scaleY
		&& coordinateView.unitX === unitX && coordinateView.unitY === unitY) return
	coordinateView = { width: surface.width, height: surface.height, minX, minY, scaleX, scaleY, unitX, unitY }
	coordinates = createCoordinateTransform(coordinateView)
}

function pixelX(value) { return coordinates.xToPixel(Number(value)) }
function pixelY(value) { return coordinates.yToPixel(Number(value)) }

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
	syncCoordinates()
	let pixelPos = getCanvasPixelPos(evt)
	let xAxisY = coordinates.originY
	let yAxisX = coordinates.originX
	let nearXAxis = xAxisY >= 0 && xAxisY <= surface.height && Math.abs(pixelPos.y - xAxisY) <= axisDragThreshold
	let nearYAxis = yAxisX >= 0 && yAxisX <= surface.width && Math.abs(pixelPos.x - yAxisX) <= axisDragThreshold

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

// Bu katman belge başvurularını çözer; sayısal geometri hesapları saf modüllerdedir.
function reprojectAllOnOther() {
	const objectsById = new Map(arrObjects.map(object => [object.id, object]))
	const circles = new Map()
	const intersections = new Map()
	const circleForProjection = circle => {
		if (!circle) return null
		if (!circles.has(circle.id)) {
			const data = getCircleDescriptor(circle)
			circles.set(circle.id, data.status ? { type: 'circleR', A: { a: data.m, b: data.n }, r: data.r } : null)
		}
		return circles.get(circle.id)
	}
	for (const point of arrObjects) {
		if (point.type !== 'point') continue
		for (const constraint of point.onOther) {
			let result = { status: false }
			if (constraint.type === 'onCircle') {
				const circle = circleForProjection(objectsById.get(constraint.circleId))
				if (circle) result = getProjectionOnCircle(circle, Number(point.a), Number(point.b))
			} else if (constraint.type === 'onLine') {
				const line = objectsById.get(constraint.lineId)
				if (line) result = getProjectionOnLine(line, Number(point.a), Number(point.b))
			} else if (constraint.type === 'onCircleTangent') {
				const tangent = objectsById.get(constraint.tangentId)
				if (tangent) result = getProjectionOnCircleTangent(tangent, Number(point.a), Number(point.b), constraint.lineIndex)
			} else if (constraint.type === 'onAngle') {
				const angle = objectsById.get(constraint.angleId)
				if (angle) result = getProjectionOnAngle(angle, Number(point.a), Number(point.b))
			} else if (constraint.type === 'reflectPoint') {
				const source = objectsById.get(constraint.sourceId)
				const center = objectsById.get(constraint.centerId)
				if (source && center) {
					const reflected = getReflectedPoint(source, center)
					result = { status: Number.isFinite(reflected.a) && Number.isFinite(reflected.b), ...reflected }
				}
			} else if (constraint.type === 'intersectLines') {
				const key = constraint.line1Id + ':' + constraint.line2Id
				if (!intersections.has(key)) intersections.set(key,
					getObjectIntersection(objectsById.get(constraint.line1Id), objectsById.get(constraint.line2Id)))
				const intersection = intersections.get(key)
				const location = intersection.points[constraint.pointIndex ?? 0]
				if (location) result = { status: true, ...location }
				point.intersectionStatus = intersection.reason
			} else if (constraint.type === 'circleTangentTouchPoint') {
				const tangent = objectsById.get(constraint.tangentId)
				const location = tangent ? getCircleTangentTouchPoint(tangent, constraint.pointIndex ?? 0) : null
				if (location) result = { status: true, ...location }
			}
			if (result.status) {
				point.a = result.a
				point.b = result.b
				delete point.geometryValid
			} else {
				// Son konum korunur; üst nesne tekrar tanımlı olduğunda izdüşüm toparlanabilir.
				point.geometryValid = false
			}
		}
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
	if (type === 'verLine') {
		let index = 1
		const names = new Set(arrObjects.map(item => item.name))
		while (names.has('denk' + index)) index++
		return 'denk' + index
	}
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
		} else if (isLimit(str).status || isTangent(str).status || isTangentHX(str).status) {
			const data = isLimit(str).status ? isLimit(str) : isTangent(str).status ? isTangent(str) : isTangentHX(str)
			const expression = resolveFunctionExpression(data.func)
			if (expression === null) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı veya ifade geçersiz.')
			} else {
				try {
					const model = data.type === 'limit' ? new mLimit(expression, data.approachVal)
						: data.type === 'tangent' ? new mTangent(expression, data.approachVal)
						: new mTangentHX(expression, data.approachVal, data.haveH)
					arrObjects.push(model)
					activeElementID = model.id
					commitHistoryState()
				} catch {
					showToast('GİRİŞ', 'Bu konumda sonlu gerçek bir analiz nesnesi oluşturulamıyor.')
				}
			}
		} else if (/^\s*Türev\s*\(/i.test(str)) {
			const data = isDerivative(str)
			if (!data.status) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı veya ifade geçersiz.')
			} else {
				try {
					const model = new mDerivative(data.func)
					arrObjects.push(model)
					activeElementID = model.id
					commitHistoryState()
				} catch {
					showToast('GİRİŞ', 'Bu ifadenin türevi hesaplanamıyor.')
				}
			}
		} else if (isFunctionCompositions(str).status) {
			const functions = isFunctionCompositions(str).functions.map(resolveFunctionExpression)
			if (functions.some(expression => expression === null)) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Fonksiyon bulunamadı veya ifade geçersiz.')
			} else {
				const model = new mFunctionComposition(functions)
				arrObjects.push(model)
				activeElementID = model.id
				commitHistoryState()
			}
		} else if (resolveFunctionExpression(str) !== null) {
			const model = new mFunction(resolveFunctionExpression(str))
			arrObjects.push(model)
			activeElementID = model.id
			commitHistoryState()
		} else if (isSectionalFunctions(str).status) {
			const data = isSectionalFunctions(str)
			const sections = []
			for (const [index, expression] of data.functions.entries()) {
				const range = data.ranges[index]
				if ((range.from !== null && !Number.isFinite(range.from))
					|| (range.to !== null && !Number.isFinite(range.to))) break
				const line = isLineWithEquation(expression)
				const curve = isFunction(expression)
				if (line.status) sections.push(new mLineWithEquation(line.m, line.n, true, range.from, range.to))
				else if (curve.status) sections.push(new mFunction(curve.func, true, range.from, range.to))
				else break
			}
			if (sections.length !== data.functions.length) {
				showToast('GİRİŞ', 'Hatalı giriş yaptınız. Parçalı fonksiyon bölümü geçersiz.')
			} else {
				const model = new mSectionalFunctions(str, sections)
				arrObjects.push(model)
				activeElementID = model.id
				commitHistoryState()
			}

		} else {
			showToast('Hata', 'Girdi tanınamadı. Lütfen doğru formatta girdiğinizden emin olun.')
		}
		drawAll()
		labelsCreator()
		event.target.value = null
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
		let data = getCircleDescriptor(obj)
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

function drawToolPreview(position) {
	const cursor = () => new mPoint(position.x, position.y, true)
	if (activeObject === 'line' && lineDrawing) {
		drawLineWithPoints(new mLineWithPoints(lineA, cursor(), true))
	} else if (activeObject === 'linesegment' && lineSegmentDrawing) {
		drawLineSegment(new mLineSegment(lineSegmentA, cursor(), true))
	} else if (activeObject === 'distancesegment' && distanceSegmentDrawing) {
		drawDistanceSegment(new mDistanceSegment(distanceSegmentA, cursor(), true))
	} else if (activeObject === 'reflectpoint' && reflectPointDrawing) {
		const center = cursor()
		const reflected = getReflectedPoint(reflectPointA, center)
		drawPoint(center)
		drawPoint(new mPoint(reflected.a, reflected.b, true))
	} else if (activeObject === 'intersect' && intersectDrawing) {
		const hovered = getHitObject(position).hit
		if (isIntersectableObject(hovered) && hovered.id !== intersectLineA.id) {
			const intersection = getObjectIntersection(intersectLineA, hovered)
			intersection.points.forEach(point => drawPoint(new mPoint(point.a, point.b, true)))
		}
	} else if (activeObject === 'angle') {
		if (!angleDrawing && angleA && !angleB) {
			drawLineSegment(new mLineSegment(angleA, cursor(), true))
		} else if (angleDrawing && angleA && angleB && !angleC) {
			drawAngle(new mAngle(angleA, angleB, cursor(), true))
		}
	} else if (activeObject === 'circle2' && circleDrawing) {
		drawCircle2(new mCircle2(circleA, cursor(), true))
	} else if (activeObject === 'circle3') {
		if (!circleDrawing && circleA && !circleB) {
			drawLineSegment(new mLineSegment(circleA, cursor(), true))
		} else if (circleDrawing && circleA && circleB && !circleC) {
			drawCircle3(new mCircle3(circleA, circleB, cursor(), true))
		}
	}
}

function initializeLegacyApp() {

	// document.addEventListener('contextmenu', event => event.preventDefault())

	drawAll()
	window.onresize = function () {
		surface.resize()
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

	canvas.addEventListener('wheel', event => {
		event.preventDefault()
		if (event.deltaY === 0) return
		const zoomIn = event.deltaY < 0
		let changed = false
		if ((zoomIn && tickY > 0) || (!zoomIn && tickY < horizontalUnits.length - 1)) {
			scaleY *= zoomIn ? 1.05 : 0.95
			tickY += zoomIn ? -1 : 1
			unitY = horizontalUnits[tickY]
			changed = true
		}
		if ((zoomIn && tickX > 0) || (!zoomIn && tickX < verticalUnits.length - 1)) {
			scaleX *= zoomIn ? 1.05 : 0.95
			tickX += zoomIn ? -1 : 1
			unitX = verticalUnits[tickX]
			changed = true
		}
		if (changed) drawAll()
	}, { passive: false })

	canvas.addEventListener('mousemove', event => {
		const position = getMousePos(event)
		const hoverHitObject = getHitObject(position)
		if (activeObject === 'select' && !grabbing && !hoverHitObject.hit) {
			const axisTarget = getAxisDragTarget(event)
			if (axisTarget === 'xAxis') canvas.style.cursor = 'ew-resize'
			if (axisTarget === 'yAxis') canvas.style.cursor = 'ns-resize'
		}

		if (grabbing && activeObject === 'select' && hitObject) {
			canvas.style.cursor = 'grabbing'
			if (axisUnitDrag) {
				canvas.style.cursor = axisUnitDrag.axis === 'xAxis' ? 'ew-resize' : 'ns-resize'
				updateAxisUnitDrag(event)
				drawAll()
			} else if (hitObject.hitType === 'point') {
				hitObject.hit.a = position.x
				hitObject.hit.b = position.y
				drawAll()
				labelsCreator()
			} else if (!hitObject.hit && panStartMouse) {
				minX = panStartMinX - (event.clientX - panStartMouse.x) / scaleY
				minY = panStartMinY - (event.clientY - panStartMouse.y) / scaleX
				drawAll()
				labelsCreator()
			}
		} else if (['line', 'linesegment', 'distancesegment', 'reflectpoint',
			'intersect', 'angle', 'circle2', 'circle3'].includes(activeObject)) {
			drawAll(() => drawToolPreview(position))
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
				const result = createPointFromHitOrMouse(hitObject, getMousePos(evt))
				if (!result.created) return
				arrObjects.push(result.point)
				activeElementID = result.point.id
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
