async function initWebGPU() {
  if (!navigator.gpu) {
    console.error("WebGPU not supported on this browser.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  return device;
}

async function createBuffer(device, data, usage) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}

const shaderCode = `
@group(0) @binding(0) var<storage, read_write> dist : array<f32>;
@group(0) @binding(1) var<uniform> kUniform : u32;
@group(0) @binding(2) var<uniform> sizeUniform : u32;

const INF: f32 = 1e9;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i : u32 = global_id.x;
  let j : u32 = global_id.y;
  let k : u32 = kUniform;
  let size : u32 = sizeUniform;

  if (i >= size || j >= size) {
    return;
  }

  let ij : u32 = i * size + j;
  let ik : u32 = i * size + k;
  let kj : u32 = k * size + j;

  if (dist[ik] >= INF || dist[kj] >= INF) {
    return;
  }
  if (dist[ij] >= INF || dist[ij] > dist[ik] + dist[kj]) {
    dist[ij] = dist[ik] + dist[kj];
  }
}
`;

async function runGPUFloydWarshall(graph) {
  const size = Math.sqrt(graph.length);
  const device = await initWebGPU();

  const distMatrix = new Float32Array(graph);
  const bufferSize = distMatrix.byteLength;

  const distBuffer = await createBuffer(
    device,
    distMatrix,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  );

  const module = device.createShaderModule({ code: shaderCode });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const kUniformBuffer = device.createBuffer({
    size: 4, // size of u32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sizeUniformBuffer = device.createBuffer({
    size: 4, // size of u32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(sizeUniformBuffer, 0, new Uint32Array([size]));

  const bindGroupLayout = pipeline.getBindGroupLayout(0);
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: distBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: kUniformBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: sizeUniformBuffer,
        },
      },
    ],
  });

  for (let k = 0; k < size; k++) {
    device.queue.writeBuffer(kUniformBuffer, 0, new Uint32Array([k]));

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const workgroupCount = Math.ceil(size / 8);
    passEncoder.dispatchWorkgroups(workgroupCount, workgroupCount);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    await device.queue.onSubmittedWorkDone();
  }

  const readBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const copyEncoder = device.createCommandEncoder();
  copyEncoder.copyBufferToBuffer(distBuffer, 0, readBuffer, 0, bufferSize);
  device.queue.submit([copyEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(readBuffer.getMappedRange());
  // console.log("Result:", result);
  return result;
}

const INF = 1e9;

async function runCPUFloydWarshall(graph) {
  const V = Math.sqrt(graph.length);
  const dist = [...graph];

  for (let k = 0; k < V; k++) {
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (dist[i * V + k] == INF || dist[k * V + j] == INF) {
          continue;
        }
        if (dist[i * V + j] > dist[i * V + k] + dist[k * V + j]) {
          dist[i * V + j] = dist[i * V + k] + dist[k * V + j];
        }
      }
    }
  }
  return dist;
}

function generateRandomGraph(V, density) {
  const graph = Array(V * V);

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (i == j) {
        graph[i * V + j] = 0;
        continue;
      }
      const weight = Math.random();
      graph[i * V + j] = weight > density ? INF : Math.floor(weight * 100);
    }
  }

  return graph;
}

function printGraph(graph) {
  const V = Math.sqrt(graph.length);
  let matrix = "";

  for (let i = 0; i < V; i++) {
    let row = "";
    for (let j = 0; j < V; j++) {
      row += graph[i * V + j] == INF ? "INF " : graph[i * V + j] + " ";
    }
    matrix += row.trim() + "\n";
  }

  console.log(matrix);
}

function checkResults(cpuGraph, gpuGraph) {
  const V = Math.sqrt(cpuGraph.length);

  for (let i = 0; i < V; i++) {
    if (cpuGraph[i] !== gpuGraph[i]) {
      console.log(
        `Answer Mismatch for path from ${Math.floor(i / V)} to ${i % V}`
      );
      console.log(`CPU: ${cpuGraph[i]}, GPU: ${gpuGraph[i]}`);
      return;
    }
  }
  console.log("Results match!");
}

function plotPerformance(sizes, gpuTimes, cpuTimes) {
  const ctx = document.getElementById("performanceChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: sizes,
      datasets: [
        {
          label: "GPU Time (ms)",
          data: gpuTimes,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true,
        },
        {
          label: "CPU Time (ms)",
          data: cpuTimes,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Graph Size (N)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Time (ms)",
          },
        },
      },
    },
  });
}

async function main() {
  const sizes = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  // const sizes = [2, 4, 8, 16, 32, 64, 128, 256];
  const density = 0.7;

  const sizeData = [];
  const gpuTimes = [];
  const cpuTimes = [];

  for (const size of sizes) {
    console.log(`Running for graph size: ${size}x${size}`);
    const graph = generateRandomGraph(size, density);
    // printGraph(graph);

    sizeData.push(size);

    // Measure GPU performance
    const gpuStart = performance.now();
    const gpuResult = await runGPUFloydWarshall(graph);
    const gpuEnd = performance.now();
    const gpuTime = gpuEnd - gpuStart;

    gpuTimes.push(gpuTime);

    console.log(`GPU Floyd-Warshall took ${gpuTime.toFixed(2)} milliseconds`);
    // printGraph(gpuResult);

    // Measure CPU performance
    const cpuStart = performance.now();
    const cpuResult = await runCPUFloydWarshall(graph);
    const cpuEnd = performance.now();
    const cpuTime = cpuEnd - cpuStart;

    cpuTimes.push(cpuTime);

    console.log(`CPU Floyd-Warshall took ${cpuTime.toFixed(2)} milliseconds`);
    // printGraph(cpuResult);

    checkResults(cpuResult, gpuResult);
    console.log("-----------BREAK--------------");
  }

  // Plot the results
  plotPerformance(sizeData, gpuTimes, cpuTimes);
}

main();
