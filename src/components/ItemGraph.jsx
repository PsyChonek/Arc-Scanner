import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component with icon
function CustomNode({ data }) {
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (data.item?.image_url) {
      window.electronAPI.loadImage(data.item.image_url).then(dataUrl => {
        if (dataUrl) {
          setImageSrc(dataUrl);
        }
      });
    }
  }, [data.item?.image_url]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Handle type="target" position={Position.Top} />
      {imageSrc && (
        <img
          src={imageSrc}
          alt={data.label}
          style={{
            width: '24px',
            height: '24px',
            objectFit: 'contain',
            borderRadius: '4px',
            flexShrink: 0,
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

function ItemGraphInner({ onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [allNodes, setAllNodes] = useState([]); // Store all nodes
  const [allEdges, setAllEdges] = useState([]); // Store all edges
  const [hideUnconnected, setHideUnconnected] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { fitView } = useReactFlow();

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
          type: 'custom',
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

        // Create a set of valid node IDs for validation
        const validNodeIds = new Set(graphNodes.map(node => node.id));

        // Convert relations to edges, filtering out invalid ones
        const graphEdges = relations
          .filter((relation) => {
            // Only create edges if both source and target nodes exist
            const isValid = validNodeIds.has(relation.source_id) && validNodeIds.has(relation.target_id);
            if (!isValid) {
              console.warn(`Skipping invalid relation: ${relation.source_id} -> ${relation.target_id} (one or both items don't exist)`);
            }
            return isValid;
          })
          .map((relation) => ({
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
        setAllNodes(graphNodes); // Store all nodes
        setEdges(graphEdges);
        setAllEdges(graphEdges); // Store all edges
      } catch (error) {
        console.error('Error loading graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, []);

  // Filter nodes based on hideUnconnected toggle and selectedItemId
  useEffect(() => {
    let filteredNodes = allNodes;
    let filteredEdges = allEdges;

    // If an item is selected, show only that item and its recycle relationships
    if (selectedItemId) {
      // Find all nodes connected via recycles_into (in either direction)
      const recycleRelatedIds = new Set([selectedItemId]);

      filteredEdges = allEdges.filter(edge => {
        if (edge.label === 'recycles_into') {
          if (edge.source === selectedItemId) {
            recycleRelatedIds.add(edge.target);
            return true;
          }
          if (edge.target === selectedItemId) {
            recycleRelatedIds.add(edge.source);
            return true;
          }
        }
        return false;
      });

      filteredNodes = allNodes.filter(node => recycleRelatedIds.has(node.id));

      // Validate edges to ensure both source and target nodes exist
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(edge =>
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      setNodes(filteredNodes);
      setEdges(filteredEdges);

      // Auto-arrange after filtering
      setTimeout(() => {
        autoArrangeWithNodes(filteredNodes, filteredEdges);
      }, 50);

      return;
    }

    // If hideUnconnected is enabled, filter out unconnected nodes
    if (hideUnconnected) {
      const connectedNodeIds = new Set();
      allEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      filteredNodes = allNodes.filter(node => connectedNodeIds.has(node.id));

      // Validate edges to ensure both source and target nodes exist
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = allEdges.filter(edge =>
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }

    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [hideUnconnected, selectedItemId, allNodes, allEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) {
      onNodeClick(node.data.item);
    }
  }, [onNodeClick]);

  // Helper function to run auto-arrange with specific nodes and edges
  const autoArrangeWithNodes = useCallback((nodesToArrange, edgesToUse) => {
    if (nodesToArrange.length === 0) return;

    // Build adjacency map for the graph, treating recycles_into specially
    const adjacencyMap = new Map();
    const reverseAdjacencyMap = new Map();
    const inDegree = new Map();
    const outDegree = new Map();
    const recycleEdges = []; // Track recycle edges separately
    
    nodesToArrange.forEach(node => {
      adjacencyMap.set(node.id, []);
      reverseAdjacencyMap.set(node.id, []);
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
    });

    edgesToUse.forEach(edge => {
      // For recycles_into, keep normal direction
      // Item A recycles_into Item B means A should be BELOW B in hierarchy
      const isRecycle = edge.label === 'recycles_into';
      
      if (isRecycle) {
        recycleEdges.push(edge);
        // Normal direction: if A recycles_into B, then A should be lower than B
        if (adjacencyMap.has(edge.source)) {
          adjacencyMap.get(edge.source).push(edge.target);
          outDegree.set(edge.source, outDegree.get(edge.source) + 1);
        }
        if (reverseAdjacencyMap.has(edge.target)) {
          reverseAdjacencyMap.get(edge.target).push(edge.source);
        }
        if (inDegree.has(edge.target)) {
          inDegree.set(edge.target, inDegree.get(edge.target) + 1);
        }
      } else {
        // Normal edges: source is above target
        if (adjacencyMap.has(edge.source)) {
          adjacencyMap.get(edge.source).push(edge.target);
          outDegree.set(edge.source, outDegree.get(edge.source) + 1);
        }
        if (reverseAdjacencyMap.has(edge.target)) {
          reverseAdjacencyMap.get(edge.target).push(edge.source);
        }
        if (inDegree.has(edge.target)) {
          inDegree.set(edge.target, inDegree.get(edge.target) + 1);
        }
      }
    });

    // Find root nodes (nodes with no incoming edges)
    const roots = nodesToArrange.filter(node => inDegree.get(node.id) === 0);
    
    // If no roots found, use nodes with minimum in-degree
    const effectiveRoots = roots.length > 0 ? roots : 
      nodesToArrange.filter(node => inDegree.get(node.id) === Math.min(...Array.from(inDegree.values())));

    // Layer assignment using BFS - preserve hierarchy by using maximum depth
    const nodeLayer = new Map();
    const visited = new Set();
    
    // Initialize all nodes with -1 (unvisited)
    nodesToArrange.forEach(node => nodeLayer.set(node.id, -1));
    
    // BFS to assign layers, keeping maximum depth for nodes with multiple paths
    const queue = effectiveRoots.map(node => ({ id: node.id, layer: 0 }));
    
    while (queue.length > 0) {
      const { id, layer } = queue.shift();
      
      // Update layer if this path is deeper (preserves hierarchy)
      if (nodeLayer.get(id) < layer) {
        nodeLayer.set(id, layer);
      }
      
      if (visited.has(id)) continue;
      visited.add(id);

      const children = adjacencyMap.get(id) || [];
      children.forEach(childId => {
        queue.push({ id: childId, layer: layer + 1 });
      });
    }

    // Handle unvisited nodes (disconnected components)
    const maxLayer = Math.max(...Array.from(nodeLayer.values()), -1);
    nodesToArrange.forEach(node => {
      if (nodeLayer.get(node.id) === -1) {
        nodeLayer.set(node.id, maxLayer + 1);
      }
    });

    // Group nodes by layer
    const layers = new Map();
    nodesToArrange.forEach(node => {
      const layer = nodeLayer.get(node.id);
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer).push(node.id);
    });

    // Sort nodes within each layer to group related items
    // Items that recycle into the same target should be close together
    layers.forEach((layerNodes, layer) => {
      layerNodes.sort((a, b) => {
        // Priority 1: Group by recycles_into relationships
        const aRecycleTargets = edgesToUse
          .filter(e => e.source === a && e.label === 'recycles_into')
          .map(e => e.target)
          .sort()
          .join(',');
        const bRecycleTargets = edgesToUse
          .filter(e => e.source === b && e.label === 'recycles_into')
          .map(e => e.target)
          .sort()
          .join(',');
        
        // If both recycle into same items, group them together
        if (aRecycleTargets && bRecycleTargets) {
          if (aRecycleTargets === bRecycleTargets) return 0;
          return aRecycleTargets.localeCompare(bRecycleTargets);
        }
        
        // Priority 2: Items that recycle into something come before items that don't
        if (aRecycleTargets && !bRecycleTargets) return -1;
        if (!aRecycleTargets && bRecycleTargets) return 1;
        
        // Priority 3: Group by what recycles into this node
        const aRecycleSources = edgesToUse
          .filter(e => e.target === a && e.label === 'recycles_into')
          .map(e => e.source)
          .sort()
          .join(',');
        const bRecycleSources = edgesToUse
          .filter(e => e.target === b && e.label === 'recycles_into')
          .map(e => e.source)
          .sort()
          .join(',');
        
        if (aRecycleSources && bRecycleSources) {
          if (aRecycleSources === bRecycleSources) return 0;
          return aRecycleSources.localeCompare(bRecycleSources);
        }
        
        // Priority 4: Consider all other relationships
        const aAllTargets = edgesToUse
          .filter(e => e.source === a)
          .map(e => e.target)
          .sort()
          .join(',');
        const bAllTargets = edgesToUse
          .filter(e => e.source === b)
          .map(e => e.target)
          .sort()
          .join(',');
        
        if (aAllTargets === bAllTargets && aAllTargets !== '') return 0;
        
        // Fall back to alphabetical
        return a.localeCompare(b);
      });
    });

    // Group items by their recycle relationships for clustering
    const recycleGroups = new Map(); // layer -> (target -> [source nodes])
    const targetLayers = new Map(); // target node -> layer
    
    // First pass: identify all target layers
    nodesToArrange.forEach(node => {
      const layer = nodeLayer.get(node.id) || 0;
      targetLayers.set(node.id, layer);
    });
    
    layers.forEach((layerNodes, layer) => {
      const layerRecycleGroups = new Map();
      
      layerNodes.forEach(nodeId => {
        const recycleTargets = edgesToUse
          .filter(e => e.source === nodeId && e.label === 'recycles_into')
          .map(e => e.target)
          .sort()
          .join(',');
        
        if (recycleTargets) {
          // Verify all sources are above target
          const targets = recycleTargets.split(',');
          const allTargetsBelow = targets.every(target => {
            const targetLayer = targetLayers.get(target);
            return targetLayer === undefined || targetLayer > layer;
          });
          
          if (allTargetsBelow) {
            if (!layerRecycleGroups.has(recycleTargets)) {
              layerRecycleGroups.set(recycleTargets, []);
            }
            layerRecycleGroups.get(recycleTargets).push(nodeId);
          }
        }
      });
      
      recycleGroups.set(layer, layerRecycleGroups);
    });

    // Improved layout with clustering for recycle groups
    const HORIZONTAL_SPACING = 280;
    const VERTICAL_SPACING = 150;
    const GROUP_SPACING = 120; // Extra space between different recycle groups
    const CLUSTER_MAX_WIDTH = 5; // Max items per row in a cluster
    const CLUSTER_ROW_SPACING = 85; // Vertical spacing within a cluster
    
    const layoutedNodes = nodesToArrange.map(node => {
      const layer = nodeLayer.get(node.id) || 0;
      const layerNodes = layers.get(layer) || [];
      const layerRecycleGroups = recycleGroups.get(layer) || new Map();
      
      // Find which group this node belongs to
      let groupKey = null;
      let groupNodes = [];
      let groupIndex = 0;
      let positionInGroup = 0;
      
      for (const [key, nodes] of layerRecycleGroups.entries()) {
        if (nodes.includes(node.id)) {
          groupKey = key;
          groupNodes = nodes;
          positionInGroup = nodes.indexOf(node.id);
          break;
        }
      }
      
      // Calculate position based on group
      let x, y;
      
      if (groupKey) {
        // Part of a recycle group - arrange in compact cluster
        const groupSize = groupNodes.length;
        const totalRows = Math.ceil(groupSize / CLUSTER_MAX_WIDTH);
        const row = Math.floor(positionInGroup / CLUSTER_MAX_WIDTH);
        const col = positionInGroup % CLUSTER_MAX_WIDTH;
        const nodesInThisRow = Math.min(CLUSTER_MAX_WIDTH, groupSize - row * CLUSTER_MAX_WIDTH);
        
        // Find group's base position (how many groups before this one)
        const groupKeys = Array.from(layerRecycleGroups.keys());
        groupIndex = groupKeys.indexOf(groupKey);
        
        // Calculate cumulative width of previous groups
        let xOffset = 0;
        for (let i = 0; i < groupIndex; i++) {
          const prevGroupNodes = layerRecycleGroups.get(groupKeys[i]);
          const prevGroupMaxWidth = Math.min(CLUSTER_MAX_WIDTH, prevGroupNodes.length);
          xOffset += (prevGroupMaxWidth * HORIZONTAL_SPACING) + GROUP_SPACING;
        }
        
        // Position within cluster - center each row
        const rowCenterOffset = ((CLUSTER_MAX_WIDTH - nodesInThisRow) * HORIZONTAL_SPACING) / 2;
        x = xOffset + rowCenterOffset + (col * HORIZONTAL_SPACING);
        y = layer * VERTICAL_SPACING + row * CLUSTER_ROW_SPACING;
        
        // If this is a target node, position it to align with center of its source cluster
        const isTarget = edgesToUse.some(e => e.target === node.id && e.label === 'recycles_into');
        if (isTarget) {
          // Find sources that recycle into this node
          const sources = edgesToUse
            .filter(e => e.target === node.id && e.label === 'recycles_into')
            .map(e => e.source);
          
          if (sources.length > 0) {
            // Position target below the center of its sources
            const sourcePositions = sources.map(sourceId => {
              const sourceNode = nodesToArrange.find(n => n.id === sourceId);
              return sourceNode ? sourceNode.position?.x || 0 : 0;
            });
            
            if (sourcePositions.length > 0) {
              const avgX = sourcePositions.reduce((a, b) => a + b, 0) / sourcePositions.length;
              x = avgX; // Center target under its sources
            }
          }
        }
      } else {
        // Check if this is a target node for recycling
        const isTarget = edgesToUse.some(e => e.target === node.id && e.label === 'recycles_into');
        
        if (isTarget) {
          // Find the recycle group(s) that target this node
          const sources = edgesToUse
            .filter(e => e.target === node.id && e.label === 'recycles_into')
            .map(e => e.source);
          
          // Find which layer(s) the sources are in
          const sourceLayers = sources.map(sourceId => nodeLayer.get(sourceId));
          const sourceLayer = sourceLayers.find(l => l !== undefined && l < layer);
          
          if (sourceLayer !== undefined) {
            const sourceLayerGroups = recycleGroups.get(sourceLayer);
            if (sourceLayerGroups) {
              // Find the group that contains these sources
              for (const [key, groupNodes] of sourceLayerGroups.entries()) {
                const hasSource = sources.some(s => groupNodes.includes(s));
                if (hasSource) {
                  // Calculate center of source group
                  const groupKeys = Array.from(sourceLayerGroups.keys());
                  const gIndex = groupKeys.indexOf(key);
                  
                  let xOffset = 0;
                  for (let i = 0; i < gIndex; i++) {
                    const prevGroupNodes = sourceLayerGroups.get(groupKeys[i]);
                    const prevGroupMaxWidth = Math.min(CLUSTER_MAX_WIDTH, prevGroupNodes.length);
                    xOffset += (prevGroupMaxWidth * HORIZONTAL_SPACING) + GROUP_SPACING;
                  }
                  
                  const groupMaxWidth = Math.min(CLUSTER_MAX_WIDTH, groupNodes.length);
                  x = xOffset + (groupMaxWidth * HORIZONTAL_SPACING) / 2;
                  y = layer * VERTICAL_SPACING;
                  break;
                }
              }
            }
          } else {
            // No source group found, use default positioning
            const positionInLayer = layerNodes.indexOf(node.id);
            x = positionInLayer * HORIZONTAL_SPACING;
            y = layer * VERTICAL_SPACING;
          }
        } else {
          // Not part of any recycle relationship - place at end
          const positionInLayer = layerNodes.indexOf(node.id);
          
          // Calculate offset for all recycle groups
          let xOffset = 0;
          for (const groupNodes of layerRecycleGroups.values()) {
            const groupMaxWidth = Math.min(CLUSTER_MAX_WIDTH, groupNodes.length);
            xOffset += (groupMaxWidth * HORIZONTAL_SPACING) + GROUP_SPACING;
          }
          
          x = xOffset + positionInLayer * HORIZONTAL_SPACING;
          y = layer * VERTICAL_SPACING;
        }
      }

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(layoutedNodes);
    
    // Fit view after a short delay to allow layout to apply
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 10);
  }, [setNodes, fitView]);

  // Auto-arrange with current nodes and edges
  const autoArrange = useCallback(() => {
    autoArrangeWithNodes(nodes, edges);
  }, [nodes, edges, autoArrangeWithNodes]);

  // Filtered items for search dropdown
  const filteredItems = allNodes.filter(node =>
    node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-3 m-2 space-y-2">
          <button
            onClick={autoArrange}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
            title="Auto arrange nodes in a hierarchical layout"
          >
            Auto Arrange
          </button>
          
          <div className="border-t pt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Item (Recycle View)
            </label>
            {!selectedItemId ? (
              <>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search item..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && filteredItems.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredItems.slice(0, 10).map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedItemId(node.id);
                          setSearchTerm(node.data.label);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        {node.data.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900">{searchTerm}</div>
                  <div className="text-xs text-blue-600 mt-0.5">Showing recycle relationships</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedItemId('');
                    setSearchTerm('');
                  }}
                  className="w-full px-2 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-medium"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
          
          <label className="flex items-center space-x-2 px-2 cursor-pointer border-t pt-2">
            <input
              type="checkbox"
              checked={hideUnconnected}
              onChange={(e) => setHideUnconnected(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
              disabled={!!selectedItemId}
            />
            <span className="text-sm text-gray-700">Hide unconnected</span>
          </label>
        </Panel>
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

// Wrap with ReactFlowProvider to enable useReactFlow hook
function ItemGraph(props) {
  return (
    <ReactFlowProvider>
      <ItemGraphInner {...props} />
    </ReactFlowProvider>
  );
}

export default ItemGraph;
