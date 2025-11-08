import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { autoArrangeNodes, DEFAULT_LAYOUT_PARAMS, ForceSimulation } from '../utils/graphLayoutUtils';
import FloatingEdge from './FloatingEdge';
import FloatingConnectionLine from './FloatingConnectionLine';

// Custom node component with icon - Memoized for performance
const CustomNode = React.memo(({ data }) => {
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
    <>
      {/* Invisible handles required for ReactFlow edge validation */}
      {/* These are hidden but necessary - floating edges calculate their own connection points */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      </div>
    </>
  );
});

// Define node and edge types outside component to prevent re-creation on every render
const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

// Memoize default edge options to prevent re-creation
const defaultEdgeOptions = {
  type: 'floating',
  style: { strokeWidth: 2 }
};

function ItemGraphInner({ onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [allNodes, setAllNodes] = useState([]); // Store all nodes
  const [allEdges, setAllEdges] = useState([]); // Store all edges
  const [hideUnconnected, setHideUnconnected] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLayoutParams, setShowLayoutParams] = useState(false);
  const [layoutParams, setLayoutParams] = useState(DEFAULT_LAYOUT_PARAMS);
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef(null);
  const animationFrameRef = useRef(null);
  const { fitView } = useReactFlow();

  // Load data from database
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        setLoading(true);
        const items = await window.electronAPI.getAllItems();
        const relations = await window.electronAPI.getAllRelations();

        // Debug: Log statistics
        console.log(`Loaded ${items.length} items and ${relations.length} relations`);

        // Count items with recyclesInto data (check both item.recyclesInto and item.data.recyclesInto)
        const itemsWithRecycles = items.filter(item => {
          const recyclesInto = item.recyclesInto || item.data?.recyclesInto;
          return recyclesInto && Object.keys(recyclesInto).length > 0;
        });
        console.log(`Items with recyclesInto data: ${itemsWithRecycles.length}`);

        // Count recycles_into relations
        const recycleRelations = relations.filter(r => r.relation_type === 'recycles_into');
        console.log(`recycles_into relations in DB: ${recycleRelations.length}`);

        // Find items with recyclesInto but no relations
        const itemsWithMissingRelations = items.filter(item => {
          const recyclesInto = item.recyclesInto || item.data?.recyclesInto;
          if (!recyclesInto || Object.keys(recyclesInto).length === 0) return false;

          // Check if this item has any recycles_into relations
          const hasRelations = recycleRelations.some(r => r.source_id === item.id);
          return !hasRelations;
        });

        if (itemsWithMissingRelations.length > 0) {
          console.warn(`${itemsWithMissingRelations.length} items have recyclesInto data but no relations:`);
          itemsWithMissingRelations.slice(0, 5).forEach(item => {
            const recyclesInto = item.recyclesInto || item.data?.recyclesInto;
            console.warn(`  - "${item.name}" (${item.id}) should recycle into:`, Object.keys(recyclesInto));
          });
        }

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
              const sourceName = items.find(i => i.id === relation.source_id)?.name || relation.source_id;
              const sourceExists = validNodeIds.has(relation.source_id);
              const targetExists = validNodeIds.has(relation.target_id);

              if (!targetExists) {
                console.warn(`Missing target item for ${relation.relation_type}: "${sourceName}" -> "${relation.target_id}"`);
              } else if (!sourceExists) {
                console.warn(`Missing source item: "${relation.source_id}" -> "${relation.target_id}"`);
              }
            }
            return isValid;
          })
          .map((relation) => ({
            id: `e${relation.source_id}-${relation.target_id}`,
            source: relation.source_id,
            target: relation.target_id,
            type: 'floating',
            animated: relation.relation_type === 'crafts_to',
            label: relation.relation_type,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            style: {
              stroke: getRelationColor(relation.relation_type),
              strokeWidth: 2,
            },
            data: {
              originalAnimated: relation.relation_type === 'crafts_to', // Store original state
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
    const layoutedNodes = autoArrangeNodes(nodesToArrange, edgesToUse, layoutParams);

    // Animate nodes to new positions smoothly
    setNodes((nds) => {
      return nds.map((node) => {
        const layoutedNode = layoutedNodes.find((ln) => ln.id === node.id);
        if (layoutedNode) {
          return {
            ...node,
            position: layoutedNode.position,
            // Add CSS transition for smooth animation
            style: {
              ...node.style,
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          };
        }
        return node;
      });
    });

    // Remove transitions after animation completes to prevent lag during manual dragging
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          style: {
            ...node.style,
            transition: undefined,
          },
        }))
      );
    }, 600); // Slightly longer than the 0.5s transition

    // Fit view after layout with delay for animation
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [setNodes, fitView, layoutParams]);

  // Auto-arrange with current nodes and edges
  const autoArrange = useCallback(() => {
    autoArrangeWithNodes(nodes, edges);
  }, [nodes, edges, autoArrangeWithNodes]);

  // Live continuous simulation when liveUpdates is enabled
  useEffect(() => {
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!liveUpdates || nodes.length === 0) {
      simulationRef.current = null;
      setIsSimulating(false);
      return;
    }

    // Initialize simulation on first run or when nodes change
    if (!simulationRef.current || simulationRef.current.nodes.length !== nodes.length) {
      simulationRef.current = new ForceSimulation(nodes, edges, layoutParams);
      setIsSimulating(true);
    }

    let frameCounter = 0;
    let lastUpdateFrame = 0;
    const REACT_UPDATE_INTERVAL = 10; // Update React state every 10 frames (~6 updates/sec at 60fps)
    const POSITION_CHANGE_THRESHOLD = 5; // Only update if node moved >5px

    // Track last known positions for change detection
    const lastPositions = new Map(nodes.map(n => [n.id, { ...n.position }]));

    const animateSimulation = () => {
      if (!simulationRef.current || !liveUpdates) return;

      frameCounter++;
      const frameSkip = Math.max(1, simulationRef.current.params.FRAME_SKIP || 2);

      // Run simulation every N frames based on current speed setting
      if (frameCounter % frameSkip === 0) {
        const converged = simulationRef.current.step();

        // Get raw positions from simulation
        const rawPositions = simulationRef.current.getRawPositions();

        // Only update React state every REACT_UPDATE_INTERVAL frames to reduce lag
        const shouldUpdateReact = (frameCounter - lastUpdateFrame) >= REACT_UPDATE_INTERVAL || converged;

        if (shouldUpdateReact) {
          lastUpdateFrame = frameCounter;

          // Filter nodes that actually moved significantly
          const nodesToUpdate = [];
          rawPositions.forEach((pos, nodeId) => {
            const lastPos = lastPositions.get(nodeId);
            if (lastPos) {
              const dx = Math.abs(pos.x - lastPos.x);
              const dy = Math.abs(pos.y - lastPos.y);

              // Update if moved significantly or if converged (final update)
              if (dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD || converged) {
                nodesToUpdate.push({ id: nodeId, position: { x: pos.x, y: pos.y } });
                lastPositions.set(nodeId, { x: pos.x, y: pos.y });
              }
            }
          });

          // Only trigger React update if we have nodes to update
          if (nodesToUpdate.length > 0) {
            const updateMap = new Map(nodesToUpdate.map(n => [n.id, n.position]));

            // Calculate transition duration based on update interval and frame skip
            // This creates smooth interpolation between discrete updates
            // At 60fps with interval=10, frameSkip=2: ~133ms transition
            const transitionDuration = converged ? 0 : ((REACT_UPDATE_INTERVAL * frameSkip) / 60) * 1000 * 0.8;

            setNodes((nds) => {
              return nds.map((node) => {
                const newPos = updateMap.get(node.id);
                if (newPos) {
                  return {
                    ...node,
                    position: newPos,
                    style: {
                      ...node.style,
                      transition: converged ? undefined : `transform ${transitionDuration}ms linear`,
                    },
                  };
                }
                return node;
              });
            });
          }
        }

        // Continue animating unless converged
        if (!converged) {
          animationFrameRef.current = requestAnimationFrame(animateSimulation);
        } else {
          setIsSimulating(false);

          // Remove transitions after convergence
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((node) => ({
                ...node,
                style: {
                  ...node.style,
                  transition: undefined,
                },
              }))
            );
          }, 0);

          // Fit view when converged
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 300 });
          }, 50);
        }
      } else {
        // Continue animation loop even when skipping simulation
        animationFrameRef.current = requestAnimationFrame(animateSimulation);
      }
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animateSimulation);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUpdates, nodes.length, edges.length]);

  // Update simulation parameters when they change during live updates
  useEffect(() => {
    if (liveUpdates && simulationRef.current) {
      simulationRef.current.params = { ...simulationRef.current.params, ...layoutParams };
    }
  }, [layoutParams, liveUpdates]);

  // Disable edge animations during live updates to improve performance
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: liveUpdates ? false : (edge.data?.originalAnimated || false),
      }))
    );
  }, [liveUpdates, setEdges]);

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
        edgeTypes={edgeTypes}
        connectionLineComponent={FloatingConnectionLine}
        connectionMode="loose"
        connectOnClick={false}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        elevateEdgesOnSelect={false}
        elementsSelectable={!liveUpdates}
        nodesDraggable={!liveUpdates}
        nodesConnectable={!liveUpdates}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => node.style?.background || '#999'}
          nodeStrokeWidth={3}
        />
        <Background variant="dots" gap={12} size={1} />

        {/* Simulation Status Indicator */}
        {isSimulating && (
          <Panel position="top-left" className="bg-blue-500 text-white rounded-lg shadow-lg px-4 py-2 m-2">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm font-medium">Simulating...</span>
            </div>
          </Panel>
        )}

        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-3 m-2 space-y-2 max-h-[90vh] overflow-y-auto">
          <button
            onClick={autoArrange}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
            title="Auto arrange nodes with force-directed layout"
          >
            Auto Arrange
          </button>

          <button
            onClick={() => setShowLayoutParams(!showLayoutParams)}
            className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors"
          >
            {showLayoutParams ? 'Hide' : 'Show'} Layout Settings
          </button>

          {showLayoutParams && (
            <div className="border-t pt-2 space-y-2 text-xs">
              <label className="flex items-center space-x-2 px-2 py-1 cursor-pointer bg-blue-50 rounded">
                <input
                  type="checkbox"
                  checked={liveUpdates}
                  onChange={(e) => setLiveUpdates(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-900">Live Updates</span>
              </label>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Simulation Speed: {layoutParams.FRAME_SKIP === 1 ? 'Very Fast (60fps)' : layoutParams.FRAME_SKIP === 2 ? 'Fast (30fps)' : layoutParams.FRAME_SKIP === 4 ? 'Medium (15fps)' : `Slow (${Math.round(60/layoutParams.FRAME_SKIP)}fps)`}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={layoutParams.FRAME_SKIP}
                  onChange={(e) => setLayoutParams({...layoutParams, FRAME_SKIP: Number(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                  <span>Fastest</span>
                  <span>Slowest</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Repulsion: {layoutParams.REPULSION_STRENGTH}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="5000"
                  value={layoutParams.REPULSION_STRENGTH}
                  onChange={(e) => setLayoutParams({...layoutParams, REPULSION_STRENGTH: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Attraction: {layoutParams.ATTRACTION_STRENGTH.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="0.0001"
                  max="0.05"
                  step="0.001"
                  value={layoutParams.ATTRACTION_STRENGTH}
                  onChange={(e) => setLayoutParams({...layoutParams, ATTRACTION_STRENGTH: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Center Gravity: {layoutParams.CENTER_GRAVITY.toFixed(4)}
                </label>
                <input
                  type="range"
                  min="0.0001"
                  max="0.02"
                  step="0.0001"
                  value={layoutParams.CENTER_GRAVITY}
                  onChange={(e) => setLayoutParams({...layoutParams, CENTER_GRAVITY: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Damping: {layoutParams.DAMPING.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.05"
                  value={layoutParams.DAMPING}
                  onChange={(e) => setLayoutParams({...layoutParams, DAMPING: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Iterations: {layoutParams.ITERATIONS}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={layoutParams.ITERATIONS}
                  onChange={(e) => setLayoutParams({...layoutParams, ITERATIONS: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Min Distance: {layoutParams.MIN_DISTANCE}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={layoutParams.MIN_DISTANCE}
                  onChange={(e) => setLayoutParams({...layoutParams, MIN_DISTANCE: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Initial Spread: {layoutParams.INITIAL_SPREAD}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={layoutParams.INITIAL_SPREAD}
                  onChange={(e) => setLayoutParams({...layoutParams, INITIAL_SPREAD: Number(e.target.value)})}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => setLayoutParams(DEFAULT_LAYOUT_PARAMS)}
                className="w-full px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          )}

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
