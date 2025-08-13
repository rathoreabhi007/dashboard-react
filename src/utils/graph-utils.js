import { Edge } from 'reactflow';

// Build a dependency map: nodeId -> [dependencies]
export function buildDependencyMap(edges: Edge[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!map[edge.target]) map[edge.target] = [];
    map[edge.target].push(edge.source);
    if (!map[edge.source]) map[edge.source] = [];
  });
  return map;
}

// Build a downstream map: nodeId -> [downstream nodes]
export function buildDownstreamMap(edges: Edge[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!map[edge.source]) map[edge.source] = [];
    map[edge.source].push(edge.target);
    if (!map[edge.target]) map[edge.target] = [];
  });
  return map;
}

// Recursively run dependencies, then the node itself
export async function runNodeWithDependencies(
  nodeId: string,
  runNodeFn: (id: string) => Promise<void>,
  dependencyMap: Record<string, string[]>,
  nodeStatusMap: Record<string, string>, // e.g. { nodeId: 'completed' }
  alreadyRun: Set<string> = new Set(),
  path: string[] = []
) {
  if (alreadyRun.has(nodeId) || nodeStatusMap[nodeId] === 'completed') return;
  if (path.includes(nodeId)) throw new Error(`Cycle detected: ${[...path, nodeId].join(' -> ')}`);
  const deps = dependencyMap[nodeId] || [];
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    await runNodeWithDependencies(dep, runNodeFn, dependencyMap, nodeStatusMap, alreadyRun, [...path, nodeId]);
    if (i < deps.length - 1) {
      await new Promise(res => setTimeout(res, 5000)); // 5-second gap between dependencies
    }
  }
  if (deps.length > 0) {
    await new Promise(res => setTimeout(res, 5000)); // 5-second gap before running the node itself
  }
  await runNodeFn(nodeId);
  alreadyRun.add(nodeId);
}

// Recursively reset all downstream nodes
export function getAllDownstreamNodes(
  nodeId: string,
  downstreamMap: Record<string, string[]>,
  visited: Set<string> = new Set()
): Set<string> {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);
  const downstream = downstreamMap[nodeId] || [];
  for (const child of downstream) {
    getAllDownstreamNodes(child, downstreamMap, visited);
  }
  return visited;
} 