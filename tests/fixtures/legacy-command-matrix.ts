// Measured in the previous application at 1440 × 900. Each scenario starts with an
// empty page; rows are complete user-visible card contents, newest first.
// TeğetC now reserves distinct names for its two touch points.
export const legacyCommandMatrix = [
  {
    name: 'dik doğru',
    steps: [{
      command: 'x=2',
      rows: [{ input: 'denk1: x = 2', output: '' }],
    }],
  },
  {
    name: 'iki noktadan doğru',
    steps: [{
      command: 'Doğru((-1,0),(1,1))',
      rows: [
        { input: 'f: Doğru((-1,0), (1,1))', output: 'y = 0.50x+0.50' },
        { input: 'B=(1,1)', output: '' },
        { input: 'A=(-1,0)', output: '' },
      ],
    }],
  },
  {
    name: 'doğru parçası',
    steps: [{
      command: 'DoğruParçası((-2,1),(-1,2))',
      rows: [
        { input: 'a: DoğruParçası((-2,1), (-1,2))', output: '' },
        { input: 'B=(-1,2)', output: '' },
        { input: 'A=(-2,1)', output: '' },
      ],
    }],
  },
  {
    name: 'iki noktadan çember',
    steps: [{
      command: 'Çember((-1,1),(0,2))',
      rows: [
        { input: 'a: Çember(A,B)', output: '' },
        { input: 'B=(0,2)', output: '' },
        { input: 'A=(-1,1)', output: '' },
      ],
    }],
  },
  {
    name: 'üç noktadan çember',
    steps: [{
      command: 'Çember((0,0),(0,-2),(-2,0))',
      rows: [
        { input: 'a: Çember(A,B,C)', output: '' },
        { input: 'C=(-2,0)', output: '' },
        { input: 'B=(0,-2)', output: '' },
        { input: 'A=(0,0)', output: '' },
      ],
    }],
  },
  {
    name: 'açı',
    steps: [{
      command: 'Açı((-1,2),(0,1),(-1,0))',
      rows: [
        { input: 'α: Açı(A,B,C)', output: 'α=90°' },
        { input: 'C=(-1,0)', output: '' },
        { input: 'B=(0,1)', output: '' },
        { input: 'A=(-1,2)', output: '' },
      ],
    }],
  },
  {
    name: 'uzaklık',
    steps: [{
      command: 'Uzaklık((-2,1),(-1,2))',
      rows: [
        { input: 'a: Uzaklık((-2,1), (-1,2))', output: '' },
        { input: 'B=(-1,2)', output: '' },
        { input: 'A=(-2,1)', output: '' },
      ],
    }],
  },
  {
    name: 'yansıtma',
    steps: [{
      command: 'YansıtNokta((1,2),(0,0))',
      rows: [
        { input: 'YansıtNokta(A,B)', output: "A'=(-1,-2)" },
        { input: 'B=(0,0)', output: '' },
        { input: 'A=(1,2)', output: '' },
      ],
    }],
  },
  {
    name: 'kesişim',
    steps: [
      {
        command: '2x-3',
        rows: [{ input: 'f: y = 2x - 3', output: '' }],
      },
      {
        command: '-x+3',
        rows: [
          { input: 'g: y = -x + 3', output: '' },
          { input: 'f: y = 2x - 3', output: '' },
        ],
      },
      {
        command: 'Kesiştir(f,g)',
        rows: [
          { input: 'A=Kesiştir(f,g)', output: 'A=(2,1)' },
          { input: 'g: y = -x + 3', output: '' },
          { input: 'f: y = 2x - 3', output: '' },
        ],
      },
    ],
  },
  {
    name: 'limit',
    steps: [{
      command: 'Limit(sin(2x-1),2)',
      rows: [{ input: 'f = Limit(sin(2x-1),2)', output: '' }],
    }],
  },
  {
    name: 'bileşke',
    steps: [{
      command: 'Bileşke(x-1,x^2-2)',
      // AST substitution omits redundant parentheses while preserving the expression.
      rows: [{ input: 'Bileşke(x-1,x^2-2)', output: 'f: y = x^2-2-1' }],
    }],
  },
  {
    name: 'teğet',
    steps: [{
      command: 'Teğet(sin(2x-1),2)',
      rows: [{ input: 'Teğet(sin(2x-1),2)', output: 'f: y = -1.98x+4.10' }],
    }],
  },
  {
    name: 'teğet H',
    steps: [{
      command: 'TeğetH(x^2,1)',
      rows: [{ input: 'TeğetH(x^2,1)', output: '[f(1+h) - f(1)] / h = 4' }],
    }],
  },
  {
    name: 'teğet X',
    steps: [{
      command: 'TeğetX(x^2,1)',
      rows: [{ input: 'TeğetX(x^2,1)', output: '[f(2) - f(x₀)] /(2-x₀)  = 3' }],
    }],
  },
  {
    name: 'çembere teğet',
    steps: [
      {
        command: 'Çember((0,0),2)',
        rows: [
          { input: 'a: Çember(A,2)', output: '' },
          { input: 'A=(0,0)', output: '' },
        ],
      },
      {
        command: 'TeğetC(a,(3,2))',
        rows: [
          { input: 'D=TeğetNokta(f,2)', output: 'D=(1.85,-0.77)' },
          { input: 'C=TeğetNokta(f,1)', output: 'C=(0,2)' },
          { input: 'f: Teğet(B,a)', output: '' },
          { input: 'B=(3,2)', output: '' },
          { input: 'a: Çember(A,2)', output: '' },
          { input: 'A=(0,0)', output: '' },
        ],
      },
    ],
  },
  {
    name: 'dizi',
    steps: [{
      command: 'Dizi(1/n,1,7)',
      rows: [{ input: 'aₙ = Dizi(1/n,1,7)', output: '' }],
    }],
  },
  {
    name: 'doğal logaritma',
    steps: [{
      command: 'log(E,4-x^2)',
      rows: [{ input: 'f: y = log(e, 4 - x ^ 2)', output: '' }],
    }],
  },
  {
    name: 'beş tabanında logaritma',
    steps: [{
      command: 'log(5,2x-3)',
      rows: [{ input: 'f: y = log(5,2x-3)', output: '' }],
    }],
  },
];
