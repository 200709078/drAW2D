import { expect, test } from '@playwright/test';
import { bignumber, complex, fraction } from 'mathjs';
import { createGeometryModels } from '../src/geometry/models';

test('geçici çizimler kimlik tüketmez ve mevcut adlandırma sırasını korur', () => {
  const calls: string[] = [];
  let nextId = 0;
  let nextName = 0;
  const models = createGeometryModels({
    createName(group) {
      calls.push(`name:${group}`);
      return `${group}-${nextName++}`;
    },
    nextId() {
      calls.push('id');
      return nextId++;
    },
    randomColor() {
      calls.push('color');
      return '#123456';
    },
  });

  const a = new models.mPoint(0, 0);
  const point = new models.mPoint(1, 2, true);
  const line = new models.mLineWithPoints(a, point, true);
  const circle = new models.mCircleR(a, 3, true);
  const tangent = new models.mCircleTangent(point, circle, true);
  const namedPreviews = [
    circle,
    new models.mCircle2(a, point, true),
    new models.mCircle3(a, point, a, true),
    new models.mAngle(a, point, a, true),
    new models.mArcMeasure(a, point, circle, true),
    new models.mLineSegment(a, point, true),
    new models.mDistanceSegment(a, point, true),
  ];
  const b = new models.mPoint(4, 5);

  expect([a.id, b.id]).toEqual([0, 1]);
  expect([point, line, tangent, ...namedPreviews].every(item => item.id === null)).toBe(true);
  expect([point.name, line.name, tangent.name]).toEqual([null, null, null]);
  expect(namedPreviews.every(item => typeof item.name === 'string')).toBe(true);
  expect(calls).toEqual([
    'name:point', 'id', 'color',
    'color',
    'color',
    'name:circleR', 'color',
    'color',
    'name:circleR', 'color',
    'name:circleR', 'color',
    'name:angle', 'color',
    'name:arcMeasure', 'color',
    'name:lineSegment', 'color',
    'name:distanceSegment', 'color',
    'name:point', 'id', 'color',
  ]);
});

test('canlı geometri başvuruları geçmiş kopyasında paylaşılır ve asıldan ayrılır', () => {
  let nextId = 0;
  const models = createGeometryModels({
    createName: group => group,
    nextId: () => nextId++,
    randomColor: () => '#123456',
  });
  const a = new models.mPoint(0, 0);
  const b = new models.mPoint(3, 4);
  const line = new models.mLineWithPoints(a, b);
  const circle = new models.mCircle2(a, b);
  const arc = new models.mArcMeasure(a, b, circle);
  const tangent = new models.mCircleTangent(b, circle);

  expect(line.A).toBe(a);
  expect(circle.B).toBe(b);
  expect(arc.circle).toBe(circle);
  expect(tangent.circle).toBe(circle);
  a.a = '6.25';
  circle.B.b = 9;
  expect(line.A.a).toBe('6.25');
  expect(line.B.b).toBe(9);
  expect(arc.B.b).toBe(9);

  const history = structuredClone([a, b, line, circle, arc, tangent] as const);

  expect(history[0]).not.toBe(a);
  expect(history[2].A).toBe(history[0]);
  expect(history[2].B).toBe(history[1]);
  expect(history[3].A).toBe(history[0]);
  expect(history[3].B).toBe(history[1]);
  expect(history[4].circle).toBe(history[3]);
  expect(history[5].circle).toBe(history[3]);
  history[0].a = 10;
  expect(history[2].A.a).toBe(10);
  expect(history[3].A.a).toBe(10);
  expect(a.a).toBe('6.25');
  b.b = -1;
  expect(history[1].b).toBe(9);
});

test('sayısal metin koordinatlar ve sonradan eklenen kesişim bilgisi geçmişte korunur', () => {
  const models = createGeometryModels({
    createName: group => group,
    nextId: () => 7,
    randomColor: () => '#123456',
  });
  const point = new models.mPoint('1.25', '-2.50');

  expect(point.a).toBe('1.25');
  expect(point.b).toBe('-2.50');
  // Legacy değerlendirme sınırından gelen özel sayısal değerler daraltılmaz.
  const radius = fraction(1, 2);
  const precise = bignumber('1.234567890123456789');
  const nonReal = complex(0, 1);
  const evaluatedPoint = new models.mPoint(precise, nonReal, true);
  expect(new models.mCircleR(point, radius).r).toBe(radius);
  expect(evaluatedPoint.a).toBe(precise);
  expect(evaluatedPoint.b).toBe(nonReal);
  for (const field of ['intersectionStatus', 'intersectionOwner', 'hideInLabels', 'intersectionPointIds']) {
    expect(Object.hasOwn(point, field)).toBe(false);
  }

  point.intersectionStatus = 'empty';
  point.intersectionOwner = true;
  point.hideInLabels = true;
  point.intersectionPointIds = [point.id, null];
  point.onOther.push({
    type: 'intersectLines',
    line1Id: 2,
    line2Id: 3,
    pointIndex: 1,
    ownerId: point.id,
  });

  const historyPoint = structuredClone(point);

  expect(historyPoint.a).toBe('1.25');
  expect(historyPoint.b).toBe('-2.50');
  expect(historyPoint.intersectionStatus).toBe('empty');
  expect(historyPoint.intersectionOwner).toBe(true);
  expect(historyPoint.hideInLabels).toBe(true);
  expect(historyPoint.intersectionPointIds).toEqual([7, null]);
  expect(historyPoint.onOther).toEqual(point.onOther);
  expect(historyPoint.onOther).not.toBe(point.onOther);
  point.onOther.length = 0;
  point.intersectionPointIds.push(8);
  expect(historyPoint.onOther).toHaveLength(1);
  expect(historyPoint.intersectionPointIds).toEqual([7, null]);
});
