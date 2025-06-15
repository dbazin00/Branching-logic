import { Branch, StepValue, TaskResults } from '@/types';

type Postfix = string | number | boolean | (boolean | number)[];

const OPERATORS = {
  COMPARISON: [
    'isEqualTo',
    'isNotEqualTo',
    'isGreaterThan',
    'isAtLeast',
    'isLessThan',
    'isAtMost',
  ],
  LOGICAL: ['allConditionsMet', 'anyConditionMet'],
  MATH: ['totalOf', 'averageOf'],
};

let globalTaskResults: TaskResults = {};

const OPERATIONS = {
  isEqualTo: (a: boolean, b: boolean): boolean => a === b,
  isNotEqualTo: (a: boolean, b: boolean): boolean => a !== b,
  isGreaterThan: (a: number, b: number): boolean => a > b,
  isAtLeast: (a: number, b: number): boolean => a >= b,
  isLessThan: (a: number, b: number): boolean => a < b,
  isAtMost: (a: number, b: number): boolean => a <= b,
  allConditionsMet: (...conditions: boolean[]): boolean =>
    conditions.every(Boolean),
  anyConditionMet: (...conditions: boolean[]): boolean =>
    conditions.some(Boolean),
  totalOf: (stepIndices: number[]): number =>
    stepIndices.reduce((a, b) => {
      return a + b;
    }, 0),
  averageOf: (stepIndices: number[]): number =>
    OPERATIONS.totalOf(stepIndices) / stepIndices.length,
  stepIndex: (stepIdx: number[] | number): StepValue[] | StepValue => {
    const getStepValue = (index: number) =>
      Array.isArray(globalTaskResults[index])
        ? globalTaskResults[index][0]
        : globalTaskResults[index];

    return Array.isArray(stepIdx)
      ? stepIdx.map(getStepValue)
      : getStepValue(stepIdx);
  },
};

const convertBranchingToPostfix = (
  expression: Branch,
  postfixArray: Postfix[] = [],
) => {
  if (['number', 'boolean', 'string'].includes(typeof expression)) {
    postfixArray.push(expression as Postfix);
    return postfixArray;
  }

  if (typeof expression !== 'object' || expression === null)
    return postfixArray;

  const [operator, operands] = Object.entries(expression)[0];

  if (operator === 'stepIndex') {
    postfixArray.push(operands);
  } else if (OPERATORS.MATH.includes(operator)) {
    convertBranchingToPostfix(operands, postfixArray);
  } else if (OPERATORS.COMPARISON.includes(operator)) {
    convertBranchingToPostfix(operands[0], postfixArray);
    convertBranchingToPostfix(operands[1], postfixArray);
  } else if (OPERATORS.LOGICAL.includes(operator)) {
    operands.forEach((operand: Branch) =>
      convertBranchingToPostfix(operand, postfixArray),
    );
  }
  postfixArray.push(operator);

  return postfixArray;
};

const evaluatePostfix = (
  postfixExpression: Postfix[],
  operands: Postfix[] = [],
) => {
  if (postfixExpression.length === 0) return operands[0];
  const expression: Postfix | undefined = postfixExpression.shift();

  if (Object.keys(OPERATIONS).includes(String(expression))) {
    const operator: keyof typeof OPERATIONS =
      expression as keyof typeof OPERATIONS;

    const operation = OPERATIONS[operator] as (
      ...args: Postfix[]
    ) => boolean | number;

    const paramCount: number = operation.length;
    const args: Postfix[] = operands.slice(-paramCount);

    return evaluatePostfix([
      ...operands.slice(0, -paramCount),
      operation(...args),
      ...postfixExpression,
    ]);
  }
  if (expression !== undefined) operands.push(expression);

  return evaluatePostfix(postfixExpression, operands);
};

export const executeBranching = (
  taskResults: TaskResults,
  branching: Branch,
) => {
  globalTaskResults = taskResults;
  const postfixExpression = convertBranchingToPostfix(branching);
  return evaluatePostfix(postfixExpression);
};
