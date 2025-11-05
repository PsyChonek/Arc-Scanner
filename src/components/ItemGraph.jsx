import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeTypes = {};

function ItemGraph({ onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
        const items = await window.electronAPI.getAllItems();
        const relations = await window.electronAPI.getAllRelations();

        // Convert items to nodes
        const graphNodes = items.map((item, index) => ({
          id: item.id,
          type: 'default',
          data: { 
            label: item.name,
            item: item,
          },
          position: { 
            x: Math.random() * 500, 
            y: Math.random() * 500 
          },
          style: {
            background: getRarityColor(item.rarity),
            color: '#fff',
            border: '2px solid #222',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
          },
        }));

        // Convert relations to edges
        const graphEdges = relations.map((relation) => ({
          id: `e${relation.source_id}-${relation.target_id}`,
          source: relation.source_id,
          target: relation.target_id,
          type: 'smoothstep',
          animated: relation.relation_type === 'crafts_to',
          label: relation.relation_type,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: {
            stroke: getRelationColor(relation.relation_type),
            strokeWidth: 2,
          },
        }));

        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (error) {
        console.error('Error loading graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) {
      onNodeClick(node.data.item);
    }
  }, [onNodeClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-600">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
        nodeTypes={nodeTypes}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => node.style?.background || '#999'}
          nodeStrokeWidth={3}
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

// Helper function to get color based on rarity
function getRarityColor(rarity) {
  const colors = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };
  return colors[rarity?.toLowerCase()] || colors.common;
}

// Helper function to get color based on relation type
function getRelationColor(relationType) {
  const colors = {
    crafts_to: '#3b82f6',
    requires: '#ef4444',
    combines_with: '#10b981',
    upgrades_to: '#f59e0b',
  };
  return colors[relationType] || '#6b7280';
}

export default ItemGraph;
