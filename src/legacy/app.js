import { createGeometryModels } from '../geometry/models'
import { createFunctionModels } from '../geometry/function-models'
import {
	distanceAB, getReflectedPoint, numericPoint,
	getProjectionOnLine, getProjectionOnSegment, getProjectionOnAngle, getProjectionOnCircle,
	getCircleDescriptor, calculateAngle, getAngleMeasure, normalizeDegree,
	getPointAngleOnCircle, isPointAtCircleCenter, isPointOnCircleData, isAngleInCcwArc,
	getPositiveArcMeasure, createLineEquation,
} from '../geometry/primitives'
import { getObjectIntersection } from '../geometry/intersections'
import {
	getCircleTangentLines, getProjectionOnCircleTangent, getCircleTangentTouchPoint,
} from '../geometry/tangents'
import { linearExpression } from '../math/function-algebra'
import { formatDisplayNumber, formatMeasure } from '../math/format-display'
import { parseCommand } from '../commands/parser'
import { prepareCommand } from '../commands/prepare'
import { createObjectName } from '../commands/names'
import { createGridRenderer } from '../rendering/coordinate-grid'
import { createCanvasSurface } from '../rendering/canvas-surface'
import { createFrameRenderer, createSceneOrder } from '../rendering/frame-renderer'
import { createFunctionEvaluator } from '../rendering/function-evaluator'
import { createCoordinateTransform } from '../rendering/coordinate-transform'
import { paintDocumentScene } from '../rendering/scene-painter'
import { createTransientPainter } from '../rendering/transient-painter'
import { GeometryDocument } from '../document/geometry-document'

const geometryDocument = new GeometryDocument()

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
	let names = geometryDocument.objects.map(item => item.name)

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
	geometryDocument.append(tangent)
	const data = getCircleTangentLines(point, circle)
	if (data.status) {
		data.tangentPoints.forEach((touch, pointIndex) => {
			const touchPoint = new mPoint(touch.a, touch.b)
			touchPoint.onOther.push({ type: 'circleTangentTouchPoint', tangentId: tangent.id, pointIndex })
			geometryDocument.append(touchPoint)
		})
	}
	return tangent
}

function createReservedName(type, reservedNames = []) {
	return createObjectName(type, [...geometryDocument.objects.map(item => item.name), ...reservedNames])
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
	let relatedPoints = geometryDocument.objects.filter(item => {
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
	for (const circle of geometryDocument.objects) {
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
	return geometryDocument.objects.filter(item => {
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
		let constrainedCircle = constraint ? geometryDocument.objects.find(item => item.id == constraint.circleId) : null
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
	geometryDocument.objects.forEach(item => {
		let reflectConstraint = getReflectPointConstraint(item)
		if (!reflectConstraint) return

		let input = document.getElementById(item.id + '-input')
		let output = document.getElementById(item.id + '-output')
		if (!input || !output) return

		let source = geometryDocument.objects.find(obj => obj.id == reflectConstraint.sourceId)
		let center = geometryDocument.objects.find(obj => obj.id == reflectConstraint.centerId)
		input.value = 'YansıtNokta(' + (source ? source.name : '?') + ',' + (center ? center.name : '?') + ')'
		output.value = item.geometryValid === false ? '∅' : item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
	})
}

function updateIntersectionPointRows() {
	geometryDocument.objects.forEach(item => {
		let intersectionConstraint = getIntersectionPointConstraint(item)
		if (!intersectionConstraint) return

		let input = document.getElementById(item.id + '-input')
		let output = document.getElementById(item.id + '-output')
		if (!input || !output) return

		let line1 = geometryDocument.objects.find(obj => obj.id == intersectionConstraint.line1Id)
		let line2 = geometryDocument.objects.find(obj => obj.id == intersectionConstraint.line2Id)
		input.value = item.name + '=Kesiştir(' + (line1 ? line1.name : '?') + ',' + (line2 ? line2.name : '?') + ')'
		output.innerHTML = getIntersectionOutput(item)
	})
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

function createPainterFrame(objects = []) {
	return {
		ctx,
		transform: coordinates,
		width: surface.width,
		height: surface.height,
		activeId: geometryDocument.activeId,
		objects,
		evaluator: functionEvaluator,
	}
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
	const frame = createPainterFrame(sceneOrder.get(geometryDocument.objects))
	if (angleA && angleB) createTransientPainter(frame).line({ type: 'lineSegment', A: angleA, B: angleB })
	paintDocumentScene(frame)
	renderPreview?.()
}

function isObjectUsedByOther(target) {
	if (target.onOther && target.onOther.length > 0) return true

	return geometryDocument.objects.some(obj => {
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
	geometryDocument.objects.forEach(item => {
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
				let source = geometryDocument.objects.find(obj => obj.id == reflectConstraint.sourceId)
				let center = geometryDocument.objects.find(obj => obj.id == reflectConstraint.centerId)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = 'YansıtNokta(' + (source ? source.name : '?') + ',' + (center ? center.name : '?') + ')'
				output.value = item.geometryValid === false ? '∅' : item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
			} else if (intersectionConstraint) {
				let line1 = geometryDocument.objects.find(obj => obj.id == intersectionConstraint.line1Id)
				let line2 = geometryDocument.objects.find(obj => obj.id == intersectionConstraint.line2Id)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = item.name + '=Kesiştir(' + (line1 ? line1.name : '?') + ',' + (line2 ? line2.name : '?') + ')'
				output.innerHTML = getIntersectionOutput(item)
			} else if (circleTangentTouchPointConstraint) {
				let tangent = geometryDocument.objects.find(obj => obj.id == circleTangentTouchPointConstraint.tangentId)
				labelA.hidden = true
				sliderA.hidden = true
				labelB.hidden = true
				sliderB.hidden = true
				input.value = item.name + '=Te\u011fetNokta(' + (tangent ? tangent.name : '?') + ',' + ((circleTangentTouchPointConstraint.pointIndex || 0) + 1) + ')'
				output.value = item.geometryValid === false ? '∅' : item.name + '=(' + getPointDisplayCoordinate(item.a) + ',' + getPointDisplayCoordinate(item.b) + ')'
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
			output.value = item.name + '=' + formatMeasure(getAngleMeasure(item)) + '°'
		} else if (item.type == 'arcMeasure') {
			labelA.hidden = true
			sliderA.hidden = true
			labelB.hidden = true
			sliderB.hidden = true
			let arcInfo = getPositiveArcMeasure(item.A, item.B, item.circle)
			input.value = item.name + ': YayÖlçüsü(' + item.A.name + ',' + item.B.name + ')'
			output.value = item.name + '=' + (arcInfo ? formatMeasure(arcInfo.span) + '\u00b0' : '?')
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
			output.value = item.name + '=' + (arcInfo ? formatMeasure(arcInfo.span) + '\u00b0' : '?')
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

		if (item.id != geometryDocument.activeId) {
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
	updateHistoryControlsState()
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
	commitSliderHistory()
	if (activeObject !== 'select' || geometryDocument.hasDraft) cancelActiveToolAndReturnSelect()
	if (!geometryDocument.objects.some(object => object.id === clickedid)) return
	if (geometryDocument.activeId != null) document.getElementById(geometryDocument.activeId + '-input').style.background = '#ffffff'
	if (geometryDocument.activeId != null) document.getElementById(geometryDocument.activeId + '-output').style.background = '#fbfcff'

	let sliders = document.querySelectorAll("input[type='range']");
	sliders.forEach(slider => {
		slider.hidden = true
	})
	let labels = document.querySelectorAll("label");
	labels.forEach(label => {
		label.hidden = true
	})
	geometryDocument.activeId = clickedid
	document.getElementById(geometryDocument.activeId + '-input').style.background = '#eaf3ff'
	document.getElementById(geometryDocument.activeId + '-output').style.background = '#f2f7ff'
	let activeitem = geometryDocument.objects.find(item => item.id == geometryDocument.activeId)

	document.getElementById(geometryDocument.activeId + '-labelA').hidden = false
	document.getElementById(geometryDocument.activeId + '-sliderA').hidden = false
	document.getElementById(geometryDocument.activeId + '-labelB').hidden = false
	document.getElementById(geometryDocument.activeId + '-sliderB').hidden = false

	if (activeitem.type == 'tangent' || activeitem.type == "verLine" || activeitem.type == 'circleR') {
		document.getElementById(geometryDocument.activeId + '-labelB').hidden = true
		document.getElementById(geometryDocument.activeId + '-sliderB').hidden = true
	}
	if (getReflectPointConstraint(activeitem) || getIntersectionPointConstraint(activeitem) || getCircleTangentTouchPointConstraint(activeitem) || activeitem.type == 'sequence' || activeitem.type == 'lineSegment' || activeitem.type == 'distanceSegment' || activeitem.type == 'circleTangent' || activeitem.type == 'lineWithPoints' || activeitem.type == 'sectionalFunctions' || activeitem.type == 'function' || activeitem.type == 'circle2' || activeitem.type == 'circle3' || activeitem.type == 'angle' || activeitem.type == 'arcMeasure' || activeitem.type == 'functioncomposition' || activeitem.type == 'derivative') {
		document.getElementById(geometryDocument.activeId + '-labelA').hidden = true
		document.getElementById(geometryDocument.activeId + '-sliderA').hidden = true
		document.getElementById(geometryDocument.activeId + '-labelB').hidden = true
		document.getElementById(geometryDocument.activeId + '-sliderB').hidden = true
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
	commitSliderHistory()
	cancelActiveToolAndReturnSelect(false)

	geometryDocument.remove(Number(delid))
	commitHistoryState()

	geometryDocument.activeId = null
	activeObject = 'select'

	drawAll()
	labelsCreator()
}

function visibilityBtnClick(e) {
	let elementid = e.target.closest("div").children[0].id
	changeActiveElement(elementid)
	let activeitem = geometryDocument.objects.find(item => item.id == geometryDocument.activeId)
	if (!activeitem) return
	if (activeitem.visibility == true) {
		activeitem.visibility = false
		e.target.style.background = 'transparent'
	} else {
		activeitem.visibility = true
		e.target.style.background = activeitem.color
	}
	commitHistoryState()
	labelsCreator()
	drawAll()
}

function moveDraggedPoint(position) {
	if (!pointDragStart || !firstMousePos || !hitObject?.hit) return
	const dx = position.x - firstMousePos.x
	const dy = position.y - firstMousePos.y
	hitObject.hit.a = pointDragStart.a + dx
	hitObject.hit.b = pointDragStart.b + dy
}

function getMousePos(evt) {
	syncCoordinates()
	const pixel = getCanvasPixelPos(evt)
	return { x: coordinates.pixelToX(pixel.x), y: coordinates.pixelToY(pixel.y) }
}

function crossSlider() {
	if (geometryDocument.activeId != null) {
		beginSliderHistory()
		let sliderA = document.getElementById(geometryDocument.activeId + '-sliderA')
		let sliderB = document.getElementById(geometryDocument.activeId + '-sliderB')
		let labelA = document.getElementById(geometryDocument.activeId + '-labelA')
		let labelB = document.getElementById(geometryDocument.activeId + '-labelB')
		let input = document.getElementById(geometryDocument.activeId + '-input')
		let output = document.getElementById(geometryDocument.activeId + '-output')
		let item = geometryDocument.objects.find(item => item.id == geometryDocument.activeId)

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

			let ownerS = geometryDocument.objects.filter(obj => {
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
					document.getElementById(owner.id + '-output').value = owner.name + '=' + formatMeasure(getAngleMeasure(owner)) + '°'
				} else if (owner.type === 'arcMeasure') {
					let arcInfo = getPositiveArcMeasure(owner.A, owner.B, owner.circle)
					inputOwner.value = owner.name + ': YayÖlçüsü(' + owner.A.name + ',' + owner.B.name + ')'
					document.getElementById(owner.id + '-output').value = owner.name + '=' + (arcInfo ? formatMeasure(arcInfo.span) + '\u00b0' : '?')
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
			output.value = item.name + '=' + (arcInfo ? formatMeasure(arcInfo.span) + '\u00b0' : '?')
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

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const objectsContainer = document.getElementById('objectsContainer')
const surface = createCanvasSurface(canvas, ctx)
surface.resize()
surface.prepare()

const clearSound = new Audio("sound/clear.mp3")
let activeObject = 'select'
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
let sliders = document.getElementById('sliders')

let grabbing = false
let hitObject = null
let pointDragStart = null
let panStartMouse = null
let panStartMinX = 0
let panStartMinY = 0
let axisUnitDrag = null
const axisDragThreshold = 8
const axisDragStep = 35

function idCounter() {
	return geometryDocument.allocateId()
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
	if (obj?.id != null) geometryDocument.trackDraft(obj.id)
}

function removeTransientObjects() {
	return geometryDocument.cancelDraft()
}

function commitDrawingHistoryState() {
	geometryDocument.finishDraft()
	commitHistoryState()
}

function beginSliderHistory() {
	geometryDocument.beginEdit()
}

function commitSliderHistory() {
	if (!geometryDocument.isEditing) return
	reprojectAllOnOther()
	geometryDocument.commitEdit()
	updateHistoryControlsState()
}

function resetInteractionState() {
	resetTransientDrawingState()
	grabbing = false
	hitObject = null
	pointDragStart = null
	firstMousePos = lastMousePos = panStartMouse = axisUnitDrag = null
	geometryDocument.activeId = null
	activeObject = 'select'
	if (window.drAW2DRadialToolbar?.selectToolByAction) {
		window.drAW2DRadialToolbar.selectToolByAction('select', { showToast: false })
	}
}

function cancelActiveToolAndReturnSelect(refresh = true) {
	geometryDocument.cancelEdit()
	removeTransientObjects()
	resetInteractionState()
	if (refresh) {
		drawAll()
		labelsCreator()
	}
}

function commitHistoryState() {
	reprojectAllOnOther()
	geometryDocument.commit()
	updateHistoryControlsState()
}

function refreshRestoredDocument() {
	resetInteractionState()
	drawAll()
	labelsCreator()
}

function undoHistoryState() {
	geometryDocument.undo()
	refreshRestoredDocument()
}

function redoHistoryState() {
	geometryDocument.redo()
	refreshRestoredDocument()
}

function updateHistoryControlsState() {
	const undoButton = document.getElementById('undo')
	const redoButton = document.getElementById('redo')
	const clearButton = document.getElementById('clear')
	if (!undoButton || !redoButton || !clearButton) return
	undoButton.disabled = !geometryDocument.canUndo
	redoButton.disabled = !geometryDocument.canRedo
	clearButton.disabled = geometryDocument.objects.length === 0
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
	const objectsById = new Map(geometryDocument.objects.map(object => [object.id, object]))
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
	for (const point of geometryDocument.objects) {
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
	return createObjectName(type, geometryDocument.objects.map(item => item.name))
}

function activateToolFromAction(action) {
	if (!action || action === activeObject) return
	if (action !== activeObject) {
		commitSliderHistory()
		grabbing = false
		pointDragStart = null
		firstMousePos = lastMousePos = panStartMouse = axisUnitDrag = null
		let removedTransientObjects = removeTransientObjects()
		resetTransientDrawingState()
		geometryDocument.activeId = null
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
	commitSliderHistory()
	cancelActiveToolAndReturnSelect()

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
			geometryDocument.activeId = circleTangentCircle.id
			showToast('Teğet', 'Şimdi teğet çizilecek noktayı seçiniz.')
		} else {
			showToast('Teğet', 'Önce teğet çizilecek çemberi seçiniz.')
		}
		return
	}

	if (hitObject.hitType == 'point' || !hitObject.hit) {
		const position = getMousePos(evt)
		const candidate = hitObject.hitType === 'point' ? hitObject.hit : { a: position.x, b: position.y }
		const tangentData = getCircleTangentLines(candidate, circleTangentCircle)
		if (tangentData.status) {
			const point = hitObject.hitType === 'point' ? hitObject.hit : new mPoint(position.x, position.y)
			if (!hitObject.hit) geometryDocument.append(point)
			const tangent = addCircleTangentWithTouchPoints(point, circleTangentCircle)
			geometryDocument.activeId = tangent.id
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
			geometryDocument.append(arcMeasureA)
			trackTransientObject(arcMeasureA)
		}
		arcMeasureCreatedA = selected.created
		arcMeasureDrawing = true
		geometryDocument.activeId = arcMeasureA.id
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
		geometryDocument.append(arcMeasureB)
		trackTransientObject(arcMeasureB)
	}

	let arcMeasure = new mArcMeasure(arcMeasureA, arcMeasureB, arcMeasureCircle)
	geometryDocument.append(arcMeasure)
	geometryDocument.activeId = arcMeasure.id
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
	if (event.isComposing || event.keyCode === 229) return
	if (!event.ctrlKey && !event.metaKey && !event.altKey) handleParanthesis(event)
	if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
	event.preventDefault()
	const input = event.target
	if (!input.value.trim()) return
	commitSliderHistory()
	cancelActiveToolAndReturnSelect(false)
	const parsed = parseCommand(input.value)
	const prepared = parsed.ok ? prepareCommand(parsed.command, geometryDocument.objects, {
		nextId: geometryDocument.nextId, randomColor: getRandomColor,
	}) : parsed
	if (prepared.ok) {
		geometryDocument.append(...prepared.objects)
		geometryDocument.activeId = prepared.activeId
		commitHistoryState()
		drawAll()
		labelsCreator()
	} else {
		showToast('GİRİŞ', prepared.error)
		drawAll()
		labelsCreator()
	}
	input.value = ''
}

function isMouseNearLineSegment(mousePos, A, B, threshold = 0.1) {
	const projection = getProjectionOnSegment(A, B, mousePos.x, mousePos.y)
	return projection.status && projection.distance < threshold
}

function isMobile() {
	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function hitPoint(mousePos, threshold) {
	for (const obj of geometryDocument.objects) {
		if (obj.type === 'point') {
			if (!obj.visibility || obj.geometryValid === false) continue
			if (!Number.isFinite(Number(obj.a)) || !Number.isFinite(Number(obj.b))) continue
			const dx = mousePos.x - obj.a
			const dy = mousePos.y - obj.b
			const distance = Math.hypot(dx, dy)

			if (distance < threshold) {
				return obj
			}
		}
	}
	return null
}

function hitLine(mousePos, obj, threshold) {
	if (['lineWithEquation', 'verLine', 'lineSegment', 'distanceSegment', 'lineWithPoints'].includes(obj.type)) {
		const projection = getProjectionOnLine(obj, mousePos.x, mousePos.y)
		return projection.status && projection.distance < threshold
	}
	if (obj.type === 'circleTangent') {
		const projection = getProjectionOnCircleTangent(obj, mousePos.x, mousePos.y)
		return projection.status && projection.distance < threshold
	}
	if (obj.type === 'sequence') {
		const expression = obj.func.replace(/(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g, 'x')
		const y = functionEvaluator.evaluate(expression, mousePos.x)
		return y !== null && Math.abs(mousePos.y - y) < threshold
	}
	return false
}

function hitCircle(mousePos, obj, threshold) {
	if (!isIntersectableCircle(obj)) return false
	const projection = getProjectionOnCircle(obj, mousePos.x, mousePos.y)
	return projection.status && projection.distance < threshold
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

	for (const obj of geometryDocument.objects) {
		if (obj.type === 'point' || !obj.visibility || obj.geometryValid === false) continue
		if (hitLine(mousePos, obj, threshold) || hitCircle(mousePos, obj, threshold) || hitAngle(mousePos, obj, threshold)) {
			canvas.style.cursor = 'pointer'
			return { hit: obj, hitType: obj.type }
		}
	}

	canvas.style.cursor = 'default'
	return { hit: null, hitType: null }
}

function drawToolPreview(position) {
	const preview = createTransientPainter(createPainterFrame())
	const cursor = () => ({ a: position.x, b: position.y })
	if (activeObject === 'line' && lineDrawing) {
		preview.line({ type: 'lineWithPoints', A: lineA, B: cursor() })
	} else if (activeObject === 'linesegment' && lineSegmentDrawing) {
		preview.line({ type: 'lineSegment', A: lineSegmentA, B: cursor() })
	} else if (activeObject === 'distancesegment' && distanceSegmentDrawing) {
		preview.distance(distanceSegmentA, cursor())
	} else if (activeObject === 'reflectpoint' && reflectPointDrawing) {
		const center = cursor()
		const reflected = getReflectedPoint(reflectPointA, center)
		preview.point(center)
		preview.point(reflected)
	} else if (activeObject === 'intersect' && intersectDrawing) {
		const hovered = getHitObject(position).hit
		if (isIntersectableObject(hovered) && hovered.id !== intersectLineA.id) {
			const intersection = getObjectIntersection(intersectLineA, hovered)
			intersection.points.forEach(point => preview.point(point))
		}
	} else if (activeObject === 'angle') {
		if (!angleDrawing && angleA && !angleB) {
			preview.line({ type: 'lineSegment', A: angleA, B: cursor() })
		} else if (angleDrawing && angleA && angleB && !angleC) {
			preview.angle(angleA, angleB, cursor())
		}
	} else if (activeObject === 'circle2' && circleDrawing) {
		preview.circle({ type: 'circle2', A: circleA, B: cursor() })
	} else if (activeObject === 'circle3') {
		if (!circleDrawing && circleA && !circleB) {
			preview.line({ type: 'lineSegment', A: circleA, B: cursor() })
		} else if (circleDrawing && circleA && circleB && !circleC) {
			preview.circle({ type: 'circle3', A: circleA, B: circleB, C: cursor() })
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

	document.getElementById('clear').addEventListener('click', function () {
		cancelActiveToolAndReturnSelect(false)
		if (geometryDocument.clear()) {
			commitHistoryState()
			clearSound.play()
		}
		drawAll()
		labelsCreator()
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
				moveDraggedPoint(position)
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
		if (evt.button !== 0) return
		commitSliderHistory()
		const toolAtStart = activeObject
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
						points.forEach(point => geometryDocument.append(point))
						geometryDocument.activeId = points[0].id
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
				geometryDocument.append(result.point)
				geometryDocument.activeId = result.point.id
				commitHistoryState()
				labelsCreator()
			}

			if (activeObject === 'line') {
				if (lineDrawing == false) {
					lineA
					hitObject.hitType == 'point' ? lineA = hitObject.hit : lineA = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						geometryDocument.append(lineA)
						trackTransientObject(lineA)
					}
					lineDrawing = true
				} else {
					lineB
					hitObject.hitType == 'point' ? lineB = hitObject.hit : lineB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						geometryDocument.append(lineB)
						trackTransientObject(lineB)
					}
					let lwp = new mLineWithPoints(lineA, lineB)
					geometryDocument.append(lwp)
					geometryDocument.activeId = lwp.id
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
						geometryDocument.append(lineSegmentA)
						trackTransientObject(lineSegmentA)
					}
					lineSegmentDrawing = true
				} else {
					let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
					lineSegmentB = pointResult.point
					if (pointResult.created) {
						geometryDocument.append(lineSegmentB)
						trackTransientObject(lineSegmentB)
					}
					let ls = new mLineSegment(lineSegmentA, lineSegmentB)
					geometryDocument.append(ls)
					geometryDocument.activeId = ls.id
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
						geometryDocument.append(distanceSegmentA)
						trackTransientObject(distanceSegmentA)
					}
					distanceSegmentDrawing = true
				} else {
					distanceSegmentB
					hitObject.hitType == 'point' ? distanceSegmentB = hitObject.hit : distanceSegmentB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						geometryDocument.append(distanceSegmentB)
						trackTransientObject(distanceSegmentB)
					}
					let ds = new mDistanceSegment(distanceSegmentA, distanceSegmentB)
					geometryDocument.append(ds)
					geometryDocument.activeId = ds.id
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
						geometryDocument.append(reflectPointA)
						trackTransientObject(reflectPointA)
						reflectPointCreatedA = true
					}
					reflectPointDrawing = true
				} else {
					if (hitObject.hitType == 'point') {
						reflectPointB = hitObject.hit
					} else {
						reflectPointB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						geometryDocument.append(reflectPointB)
						trackTransientObject(reflectPointB)
					}

					let reflectedPoint = createReflectedPoint(reflectPointA, reflectPointB)
					geometryDocument.append(reflectedPoint)
					geometryDocument.activeId = reflectedPoint.id
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
						geometryDocument.append(circleA)
						trackTransientObject(circleA)
					}
					circleDrawing = true
				} else {
					circleB
					hitObject.hitType == 'point' ? circleB = hitObject.hit : circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						geometryDocument.append(circleB)
						trackTransientObject(circleB)
					}
					let c2 = new mCircle2(circleA, circleB)
					geometryDocument.append(c2)
					geometryDocument.activeId = c2.id
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
							geometryDocument.append(circleA)
							trackTransientObject(circleA)
						}
					} else {
						circleB
						hitObject.hitType == 'point' ? circleB = hitObject.hit : circleB = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
						if (hitObject.hitType != 'point') {
							geometryDocument.append(circleB)
							trackTransientObject(circleB)
						}
						circleDrawing = true
					}
				} else {
					circleC
					hitObject.hitType == 'point' ? circleC = hitObject.hit : circleC = new mPoint(getMousePos(evt).x, getMousePos(evt).y)
					if (hitObject.hitType != 'point') {
						geometryDocument.append(circleC)
						trackTransientObject(circleC)
					}
					let c3 = new mCircle3(circleA, circleB, circleC)
					geometryDocument.append(c3)
					geometryDocument.activeId = c3.id
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
							geometryDocument.append(angleA)
							trackTransientObject(angleA)
						}
					} else {
						let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
						angleB = pointResult.point
						if (pointResult.created) {
							geometryDocument.append(angleB)
							trackTransientObject(angleB)
						}
						angleDrawing = true
					}
				} else {
					let pointResult = createPointFromHitOrMouse(hitObject, mousePos)
					angleC = pointResult.point
					if (pointResult.created) {
						geometryDocument.append(angleC)
						trackTransientObject(angleC)
					}
					let a = new mAngle(angleA, angleB, angleC)
					geometryDocument.append(a)
					geometryDocument.activeId = a.id
					commitDrawingHistoryState()
					angleDrawing = false
					angleA = angleB = angleC = null

					finishToolAndReturnSelect()
				}
			}
			if (hitObject.hit) {
				geometryDocument.activeId = hitObject.hit.id
				drawAll()
			}
		}

		if (toolAtStart === 'select' && activeObject === 'select') {
			grabbing = true
			canvas.style.cursor = 'grabbing'
			firstMousePos = getMousePos(evt)
			if (hitObject.hitType === 'point') {
				pointDragStart = numericPoint(hitObject.hit)
				geometryDocument.beginEdit()
			}
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

	// Complete an existing mouse gesture even when release occurs outside the canvas.
	window.addEventListener('mouseup', function (evt) {
		if (!grabbing || evt.button !== 0) return
		canvas.style.cursor = 'default'
		if (activeObject === 'select' && hitObject?.hitType === 'point') {
			moveDraggedPoint(getMousePos(evt))
			reprojectAllOnOther()
			geometryDocument.commitEdit()
		}
		grabbing = false
		pointDragStart = null
		firstMousePos = lastMousePos = panStartMouse = axisUnitDrag = null
		drawAll()
		labelsCreator()
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
