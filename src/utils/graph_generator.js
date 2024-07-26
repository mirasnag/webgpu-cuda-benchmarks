const fs = require("fs");
const readline = require("readline");

const INF = 1e9;

function generateGraphFromText(filename) {
  return new Promise((resolve, reject) => {
    const graph = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filename),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const row = line
        .split(" ")
        .map((weight) => (weight === "INF" ? INF : parseInt(weight, 10)));
      graph.push(row);
    });

    rl.on("close", () => resolve(graph));
    rl.on("error", (err) => reject(err));
  });
}

function generateRandomGraph(V, density) {
  const graph = Array.from({ length: V }, () => Array(V).fill(0));

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (i == j) {
        graph[i][j] = 0;
        continue;
      }
      const weight = Math.floor(Math.random() * INF);
      graph[i][j] = weight > INF * density ? INF : weight;
    }
  }

  return graph;
}

function printGraph(graph) {
  graph.forEach((row) => {
    console.log(
      row.map((weight) => (weight === INF ? "INF" : weight)).join(" ")
    );
  });
}

async function main() {
  console.log("Generating Random Graph:");
  const randGraph = generateRandomGraph(4, 0.75);
  printGraph(randGraph);
  console.log("--------");

  console.log("Generating Graph from Text File:");
  const filename = "data/input/4x4.txt";

  try {
    const textGraph = await generateGraphFromText(filename);
    printGraph(textGraph);
  } catch (err) {
    console.error(`Failed to load graph from file: ${filename}`);
    console.error(err);
  }
  console.log("--------");
}

main();
