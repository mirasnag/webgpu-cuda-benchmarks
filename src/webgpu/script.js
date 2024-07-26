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

async function runFloydWarshall(matrix) {
  const size = Math.sqrt(matrix.length);
  const device = await initWebGPU();

  const distMatrix = new Float32Array(matrix);
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
  console.log("Result:", result);
}

// Example usage:
const matrix = [
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
];

runFloydWarshall(matrix);
