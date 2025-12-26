import { CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, FRAGMENT } from "./runtimeHelpers";

export enum NodeTypes {
  ELEMENT,
  TEXT,
  ROOT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export function createCallExpression(context, args) {
  let name = context.helper(CREATE_TEXT_VNODE)
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    arguments: args,
    callee: name
  }
}

export function createVnodeCall(context, tag, props, children) {
  let name
  if (tag !== FRAGMENT) {
    name = context.helper(CREATE_ELEMENT_VNODE)
  }
  return {
    type: NodeTypes.VNODE_CALL,
    callee: name,
    tag,
    props,
    children
  }
}

export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties
  }
}