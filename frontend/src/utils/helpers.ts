import { SingleGameState } from "../models"

export function findImplicatedSuspect(gameState: SingleGameState) : string | null {
    let adj : Record<string, {target: string, type: string}[]> = {}
    console.log("Deduction graph", gameState.deduction.edges)
    for(const edge of gameState.deduction.edges) {
      if (!adj[edge.source_node.id]) {
        adj[edge.source_node.id] = []
      }
      adj[edge.source_node.id].push({
        target: edge.target_node.id,
        type: edge.type
      })
    }
    let implicatedSuspect = null
    let maxImplications = 0
    let suspectImplications : Record<string, number> = {}
    let visited = new Set()

    console.log("Adjacency list", JSON.stringify(adj))

    function dfs(currentNode : string, path : string[], edgeTypes : string[]) {
      if (visited.has(currentNode)) return
      visited.add(currentNode)
      path.push(currentNode)
      // when we reach a node 
      console.log("Current node", currentNode)
      if(!adj[currentNode] || adj[currentNode].length === 0) {
        return
      }
      for(const edge of adj[currentNode]) {
        if (edge.type === "implicates") {
          if (!suspectImplications[edge.target]) {
            suspectImplications[edge.target] = 0
          }
          suspectImplications[edge.target]++
        }
        dfs(edge.target, [...path], [...edgeTypes, edge.type])
      }
      visited.delete(currentNode)
    }

    for(const node of Object.keys(adj)) {
      dfs(node, [], [])
    }

    for(const [suspectId, implications] of Object.entries(suspectImplications)) {
      if (implications > maxImplications) {
        maxImplications = implications
        implicatedSuspect = suspectId
      }
    }
    return implicatedSuspect || null
}