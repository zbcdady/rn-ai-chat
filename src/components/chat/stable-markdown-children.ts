import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

/** The renderer generates random AST keys on every token. Keep native nodes alive
 * across append-only updates; a node's React type still governs replacement. */
export function stableMarkdownChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).map((child, index) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    if (child.props.children === undefined) return cloneElement(child, { key: String(index) });
    return cloneElement(child, { key: String(index) }, stableMarkdownChildren(child.props.children));
  });
}
