import React, { useCallback } from 'react';
import { useStore, getStraightPath } from 'reactflow';
import { getEdgeParams } from './utils/edgeUtils';

function FloatingConnectionLine({ toX, toY, fromPosition, toPosition, fromNode }) {
  const targetNode = useStore(
    useCallback(
      (store) =>
        Array.from(store.nodeInternals.values()).find(
          (node) =>
            node.positionAbsolute &&
            node.width &&
            node.height &&
            toX >= node.positionAbsolute.x &&
            toX <= node.positionAbsolute.x + node.width &&
            toY >= node.positionAbsolute.y &&
            toY <= node.positionAbsolute.y + node.height
        ),
      [toX, toY]
    )
  );

  if (!fromNode || !fromNode.positionAbsolute || !fromNode.width || !fromNode.height) {
    return null;
  }

  // If hovering over a target node, calculate the proper intersection point
  if (targetNode) {
    const { sx, sy, tx, ty } = getEdgeParams(fromNode, targetNode);
    const [edgePath] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });

    return (
      <g>
        <path
          fill="none"
          stroke="#222"
          strokeWidth={1.5}
          className="animated"
          d={edgePath}
        />
        <circle
          cx={tx}
          cy={ty}
          fill="#fff"
          r={3}
          stroke="#222"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // Otherwise draw from source center to cursor
  const [edgePath] = getStraightPath({
    sourceX: fromNode.positionAbsolute.x + fromNode.width / 2,
    sourceY: fromNode.positionAbsolute.y + fromNode.height / 2,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#222"
        strokeWidth={1.5}
        className="animated"
        d={edgePath}
      />
      <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="#222" strokeWidth={1.5} />
    </g>
  );
}

export default FloatingConnectionLine;
