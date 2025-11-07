import { Position } from 'reactflow';

// Determines which side of a node is closest to another node
// Always returns Top, Bottom, Left, or Right (strict 90-degree positions)
function getStrictEdgePosition(nodeA, nodeB) {
  const centerA = {
    x: nodeA.positionAbsolute.x + nodeA.width / 2,
    y: nodeA.positionAbsolute.y + nodeA.height / 2,
  };
  
  const centerB = {
    x: nodeB.positionAbsolute.x + nodeB.width / 2,
    y: nodeB.positionAbsolute.y + nodeB.height / 2,
  };

  const dx = Math.abs(centerB.x - centerA.x);
  const dy = Math.abs(centerB.y - centerA.y);

  // Determine which direction the other node is, prioritizing the dominant axis
  if (dx > dy) {
    // Horizontal distance is greater - use Left or Right
    return centerB.x > centerA.x ? Position.Right : Position.Left;
  } else {
    // Vertical distance is greater - use Top or Bottom
    return centerB.y > centerA.y ? Position.Bottom : Position.Top;
  }
}

// Returns the intersection point of the line between the center of a node and the center of another node with the node's border
function getNodeIntersection(intersectionNode, targetNode) {
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode;
  const targetPosition = targetNode.positionAbsolute;

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.width / 2;
  const y1 = targetPosition.y + targetNode.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// Returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) needed to create an edge
export function getEdgeParams(source, target) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  // Use strict 90-degree positions based on node positions
  const sourcePos = getStrictEdgePosition(source, target);
  const targetPos = getStrictEdgePosition(target, source);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
