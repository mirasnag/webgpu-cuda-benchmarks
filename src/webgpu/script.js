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
@group(0) @binding(0) var<storage, read_write> dist : array<array<f32, 4>, 4>;
@group(0) @binding(1) var<uniform> kUniform : u32;

const INF: f32 = 1e9;

@compute @workgroup_size(4, 4)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i : u32 = global_id.x;
  let j : u32 = global_id.y;
  let k : u32 = kUniform;

  if(dist[i][k] > INF){
    return;
  }
  if(dist[k][j] > INF){
    return;
  }
  if ((dist[i][j] >= INF || dist[i][j] > dist[i][k] + dist[k][j])) {
      dist[i][j] = dist[i][k] + dist[k][j];
  }
}
`;

async function runFloydWarshall() {
  const device = await initWebGPU();

  // Example distance matrix (4x4)
  const distMatrix = new Float32Array([
    0,
    3,
    Infinity,
    7,
    8,
    0,
    2,
    Infinity,
    5,
    Infinity,
    0,
    1,
    2,
    Infinity,
    Infinity,
    0,
  ]);

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
    ],
  });

  for (let k = 0; k < 4; k++) {
    device.queue.writeBuffer(kUniformBuffer, 0, new Uint32Array([k]));

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(4, 4); // 4x4 workgroups
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
  console.log("Result:", result);

  // readBuffer.unmap();
}

runFloydWarshall();
