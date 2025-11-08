/**
 * Graph layout utilities for auto-arranging nodes using force-directed layout
 * Optimized for flat, highly-interconnected graphs (mesh networks)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Spatial hashing for O(n) repulsion instead of O(n²)
 * - Adaptive frame rate with configurable frame skipping
 * - Change detection to minimize React re-renders
 * - Smooth CSS transitions for natural movement
 * - Tuned parameters for smooth real-time simulation
 */

// Default layout constants - OPTIMIZED FOR SMOOTH REAL-TIME SIMULATION
export const DEFAULT_LAYOUT_PARAMS = {
	REPULSION_STRENGTH: 25000, // Slightly reduced for smoother convergence
	ATTRACTION_STRENGTH: 0.008, // Slightly reduced for stability
	CENTER_GRAVITY: 0.003, // Gentler pull toward center
	DAMPING: 0.92, // Slightly higher for faster settling without jitter
	ITERATIONS: 500, // More iterations for batch mode (not used in live mode)
	MIN_DISTANCE: 150, // Minimum distance between nodes
	INITIAL_SPREAD: 500, // Initial random spread radius
	CONVERGENCE_THRESHOLD: 0.05, // Lower threshold = stops sooner when stable
	REPULSION_RADIUS: 400, // Slightly larger for better force distribution
	FRAME_SKIP: 1, // No frame skip by default = full 60fps simulation (was 2)
};

/**
 * Find connected components in the graph
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Array} Array of component node ID arrays
 */
function findConnectedComponents(nodes, edges) {
	const adjacency = new Map();
	const reverseAdjacency = new Map();

	nodes.forEach(node => {
		adjacency.set(node.id, []);
		reverseAdjacency.set(node.id, []);
	});

	edges.forEach(edge => {
		if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
			adjacency.get(edge.source).push(edge.target);
			reverseAdjacency.get(edge.target).push(edge.source);
		}
	});

	const visited = new Set();
	const components = [];

	const dfs = (nodeId, component) => {
		if (visited.has(nodeId)) return;
		visited.add(nodeId);
		component.push(nodeId);
		adjacency.get(nodeId).forEach(child => dfs(child, component));
		reverseAdjacency.get(nodeId).forEach(parent => dfs(parent, component));
	};

	nodes.forEach(node => {
		if (!visited.has(node.id)) {
			const component = [];
			dfs(node.id, component);
			components.push(component);
		}
	});

	// Sort by size (largest first)
	components.sort((a, b) => b.length - a.length);

	return components;
}

/**
 * Calculate repulsion force between two nodes
 * @param {Object} pos1 - Position of first node {x, y}
 * @param {Object} pos2 - Position of second node {x, y}
 * @param {number} repulsionStrength - Repulsion force strength
 * @param {number} minDistance - Minimum distance between nodes
 * @returns {Object} Force vector {fx, fy}
 */
function calculateRepulsion(pos1, pos2, repulsionStrength, minDistance) {
	const dx = pos1.x - pos2.x;
	const dy = pos1.y - pos2.y;
	const distanceSquared = Math.max(dx * dx + dy * dy, minDistance * minDistance);
	const distance = Math.sqrt(distanceSquared);

	// Coulomb's law: F = k / d^2
	const force = repulsionStrength / distanceSquared;

	return {
		fx: (dx / distance) * force,
		fy: (dy / distance) * force
	};
}

/**
 * Calculate attraction force between connected nodes
 * @param {Object} pos1 - Position of first node {x, y}
 * @param {Object} pos2 - Position of second node {x, y}
 * @param {number} attractionStrength - Attraction force strength
 * @returns {Object} Force vector {fx, fy}
 */
function calculateAttraction(pos1, pos2, attractionStrength) {
	const dx = pos2.x - pos1.x;
	const dy = pos2.y - pos1.y;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// Hooke's law: F = k * d
	const force = distance * attractionStrength;

	return {
		fx: (dx / distance) * force,
		fy: (dy / distance) * force
	};
}

/**
 * Layout a single component using force-directed algorithm
 * @param {Array} componentNodeIds - Node IDs in this component
 * @param {Array} nodes - All node objects
 * @param {Array} edges - All edge objects
 * @param {Object} params - Layout parameters
 * @returns {Object} Layout information
 */
function layoutForceDirected(componentNodeIds, nodes, edges, params) {
	const componentNodes = nodes.filter(n => componentNodeIds.includes(n.id));
	const componentEdges = edges.filter(e =>
		componentNodeIds.includes(e.source) && componentNodeIds.includes(e.target)
	);

	// Initialize positions randomly in a circle
	const positions = new Map();
	const velocities = new Map();

	componentNodes.forEach((node, index) => {
		const angle = (index / componentNodes.length) * 2 * Math.PI;
		const radius = params.INITIAL_SPREAD * Math.sqrt(Math.random());
		positions.set(node.id, {
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius
		});
		velocities.set(node.id, { vx: 0, vy: 0 });
	});

	// Build edge lookup for fast attraction calculation
	const connections = new Map();
	componentNodes.forEach(node => {
		connections.set(node.id, new Set());
	});
	componentEdges.forEach(edge => {
		connections.get(edge.source).add(edge.target);
		connections.get(edge.target).add(edge.source); // Treat as undirected for layout
	});

	// Force-directed simulation
	for (let iteration = 0; iteration < params.ITERATIONS; iteration++) {
		const forces = new Map();

		// Initialize forces
		componentNodes.forEach(node => {
			forces.set(node.id, { fx: 0, fy: 0 });
		});

		// Calculate repulsion forces (all pairs)
		for (let i = 0; i < componentNodes.length; i++) {
			for (let j = i + 1; j < componentNodes.length; j++) {
				const node1 = componentNodes[i];
				const node2 = componentNodes[j];
				const pos1 = positions.get(node1.id);
				const pos2 = positions.get(node2.id);

				const repulsion = calculateRepulsion(pos1, pos2, params.REPULSION_STRENGTH, params.MIN_DISTANCE);

				const force1 = forces.get(node1.id);
				force1.fx += repulsion.fx;
				force1.fy += repulsion.fy;

				const force2 = forces.get(node2.id);
				force2.fx -= repulsion.fx;
				force2.fy -= repulsion.fy;
			}
		}

		// Calculate attraction forces (connected pairs)
		componentEdges.forEach(edge => {
			const pos1 = positions.get(edge.source);
			const pos2 = positions.get(edge.target);

			const attraction = calculateAttraction(pos1, pos2, params.ATTRACTION_STRENGTH);

			const force1 = forces.get(edge.source);
			force1.fx += attraction.fx;
			force1.fy += attraction.fy;

			const force2 = forces.get(edge.target);
			force2.fx -= attraction.fx;
			force2.fy -= attraction.fy;
		});

		// Apply center gravity
		componentNodes.forEach(node => {
			const pos = positions.get(node.id);
			const force = forces.get(node.id);
			force.fx -= pos.x * params.CENTER_GRAVITY;
			force.fy -= pos.y * params.CENTER_GRAVITY;
		});

		// Update velocities and positions
		componentNodes.forEach(node => {
			const force = forces.get(node.id);
			const velocity = velocities.get(node.id);
			const position = positions.get(node.id);

			// Update velocity with damping
			velocity.vx = (velocity.vx + force.fx) * params.DAMPING;
			velocity.vy = (velocity.vy + force.fy) * params.DAMPING;

			// Update position
			position.x += velocity.vx;
			position.y += velocity.vy;
		});
	}

	// Post-processing: Eliminate any remaining overlaps
	const overlapIterations = 50;
	for (let iter = 0; iter < overlapIterations; iter++) {
		let hasOverlap = false;

		for (let i = 0; i < componentNodes.length; i++) {
			for (let j = i + 1; j < componentNodes.length; j++) {
				const pos1 = positions.get(componentNodes[i].id);
				const pos2 = positions.get(componentNodes[j].id);

				const dx = pos2.x - pos1.x;
				const dy = pos2.y - pos1.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < params.MIN_DISTANCE) {
					hasOverlap = true;
					// Push nodes apart
					const overlap = params.MIN_DISTANCE - distance;
					const angle = Math.atan2(dy, dx);
					const pushX = Math.cos(angle) * overlap * 0.5;
					const pushY = Math.sin(angle) * overlap * 0.5;

					pos1.x -= pushX;
					pos1.y -= pushY;
					pos2.x += pushX;
					pos2.y += pushY;
				}
			}
		}

		if (!hasOverlap) break;
	}

	// Calculate bounds
	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	positions.forEach(pos => {
		minX = Math.min(minX, pos.x);
		maxX = Math.max(maxX, pos.x);
		minY = Math.min(minY, pos.y);
		maxY = Math.max(maxY, pos.y);
	});

	const width = maxX - minX + 300;
	const height = maxY - minY + 300;

	// Normalize positions
	const normalizedPositions = new Map();
	positions.forEach((pos, nodeId) => {
		normalizedPositions.set(nodeId, {
			x: pos.x - minX + 150,
			y: pos.y - minY + 150
		});
	});

	return {
		nodes: componentNodes,
		positions: normalizedPositions,
		width,
		height
	};
}

/**
 * Auto-arrange nodes using force-directed layout
 * Optimized for flat, highly-interconnected graphs
 * @param {Array} nodesToArrange - Array of node objects to arrange
 * @param {Array} edgesToUse - Array of edge objects
 * @param {Object} customParams - Optional custom layout parameters
 * @returns {Array} Array of nodes with updated positions
 */
export function autoArrangeNodes(nodesToArrange, edgesToUse, customParams = {}) {
	if (nodesToArrange.length === 0) return [];

	// Merge custom params with defaults
	const params = { ...DEFAULT_LAYOUT_PARAMS, ...customParams };

	// Handle single node case
	if (nodesToArrange.length === 1) {
		return [{
			...nodesToArrange[0],
			position: { x: 0, y: 0 }
		}];
	}

	// Find connected components
	const components = findConnectedComponents(nodesToArrange, edgesToUse);

	// Layout each component
	const componentLayouts = components.map(componentNodeIds =>
		layoutForceDirected(componentNodeIds, nodesToArrange, edgesToUse, params)
	);

	// Arrange components in a grid
	const allLayoutedNodes = [];
	const MAX_ROW_WIDTH = 2000;
	const COMPONENT_SPACING = 150;

	let currentX = 0;
	let currentY = 0;
	let maxHeightInRow = 0;

	componentLayouts.forEach(layout => {
		// Check if we need to wrap to next row
		if (currentX > 0 && currentX + layout.width > MAX_ROW_WIDTH) {
			currentX = 0;
			currentY += maxHeightInRow + COMPONENT_SPACING;
			maxHeightInRow = 0;
		}

		// Add nodes with offset positions
		layout.nodes.forEach(node => {
			const pos = layout.positions.get(node.id);
			if (pos) {
				allLayoutedNodes.push({
					...node,
					position: {
						x: currentX + pos.x,
						y: currentY + pos.y
					}
				});
			}
		});

		currentX += layout.width + COMPONENT_SPACING;
		maxHeightInRow = Math.max(maxHeightInRow, layout.height);
	});

	return allLayoutedNodes;
}

/**
 * Force-directed simulation state for continuous, live layout updates
 * Allows incremental simulation steps rather than batch processing
 */
export class ForceSimulation {
	constructor(nodesToArrange, edgesToUse, params = {}) {
		this.nodes = nodesToArrange;
		this.edges = edgesToUse;
		this.params = { ...DEFAULT_LAYOUT_PARAMS, ...params };
		
		// Initialize state for each component
		this.components = findConnectedComponents(nodesToArrange, edgesToUse);
		this.componentStates = this.components.map(componentNodeIds => 
			this.initializeComponentState(componentNodeIds)
		);
		
		this.isConverged = false;
		this.totalVelocity = 0;
		this.iteration = 0;
	}

	initializeComponentState(componentNodeIds) {
		const componentNodes = this.nodes.filter(n => componentNodeIds.includes(n.id));
		const componentEdges = this.edges.filter(e =>
			componentNodeIds.includes(e.source) && componentNodeIds.includes(e.target)
		);

		const positions = new Map();
		const velocities = new Map();

		componentNodes.forEach((node, index) => {
			const angle = (index / componentNodes.length) * 2 * Math.PI;
			const radius = this.params.INITIAL_SPREAD * Math.sqrt(Math.random());
			positions.set(node.id, {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius
			});
			velocities.set(node.id, { vx: 0, vy: 0 });
		});

		// Build connections map
		const connections = new Map();
		componentNodes.forEach(node => {
			connections.set(node.id, new Set());
		});
		componentEdges.forEach(edge => {
			connections.get(edge.source).add(edge.target);
			connections.get(edge.target).add(edge.source);
		});

		return {
			nodeIds: componentNodeIds,
			nodes: componentNodes,
			edges: componentEdges,
			positions,
			velocities,
			connections
		};
	}

	/**
	 * Perform a single iteration of the simulation
	 * @returns {boolean} True if converged, false if still moving
	 */
	step(newParams = null) {
		if (newParams) {
			this.params = { ...this.params, ...newParams };
		}

		this.iteration++;
		this.totalVelocity = 0;

		// Simulate each component
		this.componentStates.forEach(state => {
			this.stepComponent(state);
		});

		// Check convergence: average velocity below threshold
		const avgVelocity = this.totalVelocity / (this.nodes.length || 1);
		this.isConverged = avgVelocity < this.params.CONVERGENCE_THRESHOLD;

		return this.isConverged;
	}

	stepComponent(state) {
		const { nodes, edges, positions, velocities, connections } = state;
		const forces = new Map();

		// Initialize forces
		nodes.forEach(node => {
			forces.set(node.id, { fx: 0, fy: 0 });
		});

		// OPTIMIZED: Use spatial hashing for repulsion calculation
		// This reduces complexity from O(n²) to approximately O(n)
		const repulsionRadius = this.params.REPULSION_RADIUS || 400;
		const cellSize = repulsionRadius; // Grid cell size equals repulsion radius
		const grid = new Map(); // Spatial hash grid

		// Build spatial hash grid
		nodes.forEach(node => {
			const pos = positions.get(node.id);
			const cellX = Math.floor(pos.x / cellSize);
			const cellY = Math.floor(pos.y / cellSize);
			const key = `${cellX},${cellY}`;
			
			if (!grid.has(key)) {
				grid.set(key, []);
			}
			grid.get(key).push({ node, pos });
		});

		// Calculate repulsion using spatial hash
		// Only check nodes in same cell and adjacent cells (3x3 grid)
		nodes.forEach(node1 => {
			const pos1 = positions.get(node1.id);
			const force1 = forces.get(node1.id);
			const cellX = Math.floor(pos1.x / cellSize);
			const cellY = Math.floor(pos1.y / cellSize);

			// Check current cell and 8 neighbors
			for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					const key = `${cellX + dx},${cellY + dy}`;
					const cellNodes = grid.get(key);
					
					if (!cellNodes) continue;

					cellNodes.forEach(({ node: node2, pos: pos2 }) => {
						// Skip self
						if (node1.id === node2.id) return;

						const dx = pos2.x - pos1.x;
						const dy = pos2.y - pos1.y;
						const distSquared = dx * dx + dy * dy;
						const radiusSquared = repulsionRadius * repulsionRadius;

						// Skip if nodes are too far apart
						if (distSquared > radiusSquared) return;

						const repulsion = calculateRepulsion(pos1, pos2, this.params.REPULSION_STRENGTH, this.params.MIN_DISTANCE);

						force1.fx += repulsion.fx;
						force1.fy += repulsion.fy;

						// Also apply to node2 (Newton's third law)
						const force2 = forces.get(node2.id);
						force2.fx -= repulsion.fx;
						force2.fy -= repulsion.fy;
					});
				}
			}
		});

		// Calculate attraction forces (connected pairs only)
		edges.forEach(edge => {
			const pos1 = positions.get(edge.source);
			const pos2 = positions.get(edge.target);

			const attraction = calculateAttraction(pos1, pos2, this.params.ATTRACTION_STRENGTH);

			const force1 = forces.get(edge.source);
			force1.fx += attraction.fx;
			force1.fy += attraction.fy;

			const force2 = forces.get(edge.target);
			force2.fx -= attraction.fx;
			force2.fy -= attraction.fy;
		});

		// Apply center gravity
		nodes.forEach(node => {
			const pos = positions.get(node.id);
			const force = forces.get(node.id);
			force.fx -= pos.x * this.params.CENTER_GRAVITY;
			force.fy -= pos.y * this.params.CENTER_GRAVITY;
		});

		// Update velocities and positions
		nodes.forEach(node => {
			const force = forces.get(node.id);
			const velocity = velocities.get(node.id);
			const position = positions.get(node.id);

			// Update velocity with damping
			velocity.vx = (velocity.vx + force.fx) * this.params.DAMPING;
			velocity.vy = (velocity.vy + force.fy) * this.params.DAMPING;

			// Update position
			position.x += velocity.vx;
			position.y += velocity.vy;

			// Track total velocity for convergence check
			this.totalVelocity += Math.abs(velocity.vx) + Math.abs(velocity.vy);
		});
	}

	/**
	 * Get current node positions in normalized, component-arranged form
	 * @returns {Array} Array of nodes with updated positions
	 */
	getPositions() {
		const allLayoutedNodes = [];
		const MAX_ROW_WIDTH = 2000;
		const COMPONENT_SPACING = 150;

		let currentX = 0;
		let currentY = 0;
		let maxHeightInRow = 0;

		this.componentStates.forEach(state => {
			// Calculate bounds for this component
			let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
			state.positions.forEach(pos => {
				minX = Math.min(minX, pos.x);
				maxX = Math.max(maxX, pos.x);
				minY = Math.min(minY, pos.y);
				maxY = Math.max(maxY, pos.y);
			});

			const width = maxX - minX + 300;
			const height = maxY - minY + 300;

			// Check if we need to wrap to next row
			if (currentX > 0 && currentX + width > MAX_ROW_WIDTH) {
				currentX = 0;
				currentY += maxHeightInRow + COMPONENT_SPACING;
				maxHeightInRow = 0;
			}

			// Add nodes with offset positions
			state.nodes.forEach(node => {
				const pos = state.positions.get(node.id);
				if (pos) {
					allLayoutedNodes.push({
						...node,
						position: {
							x: currentX + pos.x - minX + 150,
							y: currentY + pos.y - minY + 150
						}
					});
				}
			});

			currentX += width + COMPONENT_SPACING;
			maxHeightInRow = Math.max(maxHeightInRow, height);
		});

		return allLayoutedNodes;
	}

	/**
	 * Get raw positions from all components without normalization (fast for live updates)
	 * @returns {Map} Map of nodeId -> {x, y}
	 */
	getRawPositions() {
		const positions = new Map();
		this.componentStates.forEach(state => {
			state.nodes.forEach(node => {
				const pos = state.positions.get(node.id);
				if (pos) {
					positions.set(node.id, { x: pos.x, y: pos.y });
				}
			});
		});
		return positions;
	}
}
