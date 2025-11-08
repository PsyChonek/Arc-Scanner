import React, { useCallback } from 'react';
import { useStore, getBezierPath } from 'reactflow';
import { getEdgeParams } from './utils/edgeUtils';

function FloatingEdge({ id, source, target, markerEnd, style }) {
  const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
  const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Wait for nodes to be measured by React Flow
  // Nodes need width, height, and positionAbsolute to calculate edge positions
  if (!sourceNode.width || !sourceNode.height || !targetNode.width || !targetNode.height) {
    return null;
  }

  if (!sourceNode.positionAbsolute || !targetNode.positionAbsolute) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={style}
    />
  );
}

export default React.memo(FloatingEdge);
